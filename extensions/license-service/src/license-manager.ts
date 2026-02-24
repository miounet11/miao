import * as vscode from 'vscode';
import { DeviceFingerprint } from './device-fingerprint';
import {
  LicenseInfo,
  VerifyRequest,
  VerifyResponse,
  CachedLicenseData,
  DeviceInfo,
} from './types/license';

/**
 * License manager - handles verification and caching
 */
export class LicenseManager {
  private cachedLicense: CachedLicenseData | null = null;
  private verificationTimer: NodeJS.Timeout | null = null;

  private readonly onDidChangeLicenseEmitter = new vscode.EventEmitter<LicenseInfo | null>();
  public readonly onDidChangeLicense = this.onDidChangeLicenseEmitter.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly apiBaseUrl: string
  ) {}

  async initialize(): Promise<void> {
    // Load cached license
    await this.loadCachedLicense();

    // Verify license on startup
    try {
      await this.verifyLicense();
    } catch (error) {
      console.error('License verification failed on startup:', error);
      // Check if we can use cached license (offline grace period)
      if (this.cachedLicense && this.isWithinGracePeriod()) {
        console.log('Using cached license (offline mode)');
        this.onDidChangeLicenseEmitter.fire(this.cachedLicense.licenseInfo);
      } else {
        this.onDidChangeLicenseEmitter.fire(null);
      }
    }

    // Start periodic verification (every 24 hours)
    this.startPeriodicVerification();
  }

  async verifyLicense(licenseKey?: string): Promise<LicenseInfo> {
    const deviceFingerprint = DeviceFingerprint.generate();
    const deviceName = DeviceFingerprint.getDeviceName();

    // Get license key from settings if not provided
    if (!licenseKey) {
      licenseKey = await this.context.secrets.get('miaoda.license.key');
    }

    const request: VerifyRequest = {
      licenseKey,
      deviceFingerprint,
      deviceName,
    };

    try {
      // Get access token from auth service
      const authService = vscode.extensions.getExtension('miaoda.auth-service');
      let accessToken: string | null = null;

      if (authService) {
        const authAPI = await authService.activate();
        accessToken = await authAPI.getAccessToken();
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.apiBaseUrl}/api/v1/licenses/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = (await response.json()) as VerifyResponse;

      if (data.status === 'device_limit_exceeded') {
        throw new Error(
          `Device limit exceeded (${data.currentDevices}/${data.maxDevices}). ` +
            'Please unbind a device or upgrade your plan.'
        );
      }

      const licenseInfo: LicenseInfo = {
        licenseKey: licenseKey || '',
        status: data.status,
        plan: data.plan,
        features: data.features,
        maxDevices: data.maxDevices,
        currentDevices: data.currentDevices,
        expiresAt: data.expiresAt,
        offlineGracePeriod: data.offlineGracePeriod,
      };

      // Cache license
      await this.cacheLicense(licenseInfo, deviceFingerprint);

      // Save license key
      if (licenseKey) {
        await this.context.secrets.store('miaoda.license.key', licenseKey);
      }

      this.onDidChangeLicenseEmitter.fire(licenseInfo);

      return licenseInfo;
    } catch (error) {
      throw error;
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const authService = vscode.extensions.getExtension('miaoda.auth-service');
    if (!authService) {
      throw new Error('Auth service not available');
    }

    const authAPI = await authService.activate();
    const accessToken = await authAPI.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.apiBaseUrl}/api/v1/licenses/devices`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get devices: HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.devices || [];
  }

  async unbindDevice(fingerprint: string): Promise<void> {
    const authService = vscode.extensions.getExtension('miaoda.auth-service');
    if (!authService) {
      throw new Error('Auth service not available');
    }

    const authAPI = await authService.activate();
    const accessToken = await authAPI.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.apiBaseUrl}/api/v1/licenses/devices/${fingerprint}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to unbind device: HTTP ${response.status}`);
    }
  }

  getLicenseInfo(): LicenseInfo | null {
    return this.cachedLicense?.licenseInfo || null;
  }

  hasFeature(feature: string): boolean {
    return this.cachedLicense?.licenseInfo.features.includes(feature) || false;
  }

  private async cacheLicense(
    licenseInfo: LicenseInfo,
    deviceFingerprint: string
  ): Promise<void> {
    this.cachedLicense = {
      licenseInfo,
      lastVerified: Date.now(),
      deviceFingerprint,
    };

    await this.context.globalState.update('miaoda.license.cache', this.cachedLicense);
  }

  private async loadCachedLicense(): Promise<void> {
    this.cachedLicense =
      this.context.globalState.get<CachedLicenseData>('miaoda.license.cache') || null;
  }

  private isWithinGracePeriod(): boolean {
    if (!this.cachedLicense) {
      return false;
    }

    const config = vscode.workspace.getConfiguration('miaoda.license');
    const gracePeriodHours = config.get<number>('offlineGracePeriod', 72);
    const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;

    const timeSinceLastVerification = Date.now() - this.cachedLicense.lastVerified;
    return timeSinceLastVerification < gracePeriodMs;
  }

  private startPeriodicVerification(): void {
    // Verify every 24 hours
    const interval = 24 * 60 * 60 * 1000;

    this.verificationTimer = setInterval(async () => {
      try {
        await this.verifyLicense();
      } catch (error) {
        console.error('Periodic license verification failed:', error);
      }
    }, interval);
  }

  dispose(): void {
    if (this.verificationTimer) {
      clearInterval(this.verificationTimer);
    }
    this.onDidChangeLicenseEmitter.dispose();
  }
}
