/**
 * License types for Miaoda IDE
 */

export type Plan = 'free' | 'pro' | 'team' | 'enterprise';

export interface LicenseInfo {
  licenseKey: string;
  status: 'active' | 'expired' | 'suspended' | 'invalid';
  plan: Plan;
  features: string[];
  maxDevices: number;
  currentDevices: number;
  expiresAt?: string; // ISO date string
  offlineGracePeriod: number; // hours
}

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  lastSeen: string; // ISO date string
  platform: string;
}

export interface VerifyRequest {
  licenseKey?: string;
  deviceFingerprint: string;
  deviceName: string;
}

export interface VerifyResponse {
  status: 'active' | 'expired' | 'suspended' | 'invalid' | 'device_limit_exceeded';
  plan: Plan;
  features: string[];
  maxDevices: number;
  currentDevices: number;
  offlineGracePeriod: number;
  expiresAt?: string;
  message?: string;
}

export interface CachedLicenseData {
  licenseInfo: LicenseInfo;
  lastVerified: number; // timestamp
  deviceFingerprint: string;
}
