import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Generate stable device fingerprint
 * Based on hardware information that doesn't change on restart
 */
export class DeviceFingerprint {
  /**
   * Generate device fingerprint
   * Uses hostname + platform + arch as base
   * In production, should use MAC address + disk serial number
   */
  static generate(): string {
    const components = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'unknown',
    ];

    const data = components.join('|');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get device name for display
   */
  static getDeviceName(): string {
    return `${os.hostname()} (${os.platform()})`;
  }

  /**
   * Get platform info
   */
  static getPlatform(): string {
    return `${os.platform()}-${os.arch()}`;
  }
}
