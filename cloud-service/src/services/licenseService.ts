import { getPostgresPool } from '../config/database';
import crypto from 'crypto';
import type { SubscriptionPlan } from './subscriptionService';

/**
 * License verification result
 */
export interface LicenseVerificationResult {
	status: 'valid' | 'invalid' | 'expired' | 'device_limit_exceeded';
	plan?: SubscriptionPlan;
	features?: string[];
	maxDevices?: number;
	currentDevices?: number;
	offlineGracePeriod?: number; // hours
	error?: string;
}

/**
 * License info
 */
export interface LicenseInfo {
	id: number;
	userId: number;
	licenseKey: string;
	plan: SubscriptionPlan;
	maxDevices: number;
	features: string[];
	expiresAt?: Date;
	createdAt: Date;
}

/**
 * Device binding info
 */
export interface DeviceBinding {
	id: number;
	licenseId: number;
	deviceFingerprint: string;
	deviceName?: string;
	lastSeenAt: Date;
	createdAt: Date;
}

/**
 * License service
 */
export class LicenseService {
	private readonly OFFLINE_GRACE_PERIOD = 72; // 72 hours

	/**
	 * Generate license key (XXXX-XXXX-XXXX-XXXX format)
	 */
	generateLicenseKey(): string {
		const segments: string[] = [];
		for (let i = 0; i < 4; i++) {
			const segment = crypto.randomBytes(2).toString('hex').toUpperCase();
			segments.push(segment);
		}
		return segments.join('-');
	}

	/**
	 * Create license for user
	 */
	async createLicense(
		userId: number,
		plan: SubscriptionPlan,
		maxDevices: number = 1
	): Promise<LicenseInfo> {
		const pool = getPostgresPool();

		// Generate unique license key
		let licenseKey: string;
		let isUnique = false;
		while (!isUnique) {
			licenseKey = this.generateLicenseKey();
			const existing = await pool.query(
				'SELECT id FROM licenses WHERE license_key = $1',
				[licenseKey]
			);
			isUnique = existing.rows.length === 0;
		}

		// Get features for plan
		const features = this.getFeaturesForPlan(plan);

		// Create license
		const result = await pool.query(
			`INSERT INTO licenses (user_id, license_key, plan, max_devices, features)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING *`,
			[userId, licenseKey!, plan, maxDevices, JSON.stringify(features)]
		);

		return this.toLicenseInfo(result.rows[0]);
	}

	/**
	 * Verify license
	 */
	async verifyLicense(
		licenseKey: string,
		deviceFingerprint: string,
		deviceName?: string
	): Promise<LicenseVerificationResult> {
		const pool = getPostgresPool();

		// Get license
		const licenseResult = await pool.query(
			'SELECT * FROM licenses WHERE license_key = $1',
			[licenseKey]
		);

		if (licenseResult.rows.length === 0) {
			return {
				status: 'invalid',
				error: 'License key not found',
			};
		}

		const license = licenseResult.rows[0];

		// Check expiration
		if (license.expires_at && new Date(license.expires_at) < new Date()) {
			return {
				status: 'expired',
				error: 'License has expired',
			};
		}

		// Get device bindings
		const devicesResult = await pool.query(
			'SELECT * FROM device_bindings WHERE license_id = $1',
			[license.id]
		);

		const devices = devicesResult.rows;
		const existingDevice = devices.find(d => d.device_fingerprint === deviceFingerprint);

		if (existingDevice) {
			// Update last seen
			await pool.query(
				'UPDATE device_bindings SET last_seen_at = NOW() WHERE id = $1',
				[existingDevice.id]
			);
		} else {
			// Check device limit
			if (devices.length >= license.max_devices) {
				return {
					status: 'device_limit_exceeded',
					plan: license.plan,
					maxDevices: license.max_devices,
					currentDevices: devices.length,
					error: `Device limit reached (${devices.length}/${license.max_devices}). Unbind a device or upgrade your plan.`,
				};
			}

			// Bind new device
			await pool.query(
				`INSERT INTO device_bindings (license_id, device_fingerprint, device_name)
				 VALUES ($1, $2, $3)`,
				[license.id, deviceFingerprint, deviceName]
			);
		}

		// Parse features
		const features = typeof license.features === 'string'
			? JSON.parse(license.features)
			: license.features;

		return {
			status: 'valid',
			plan: license.plan,
			features,
			maxDevices: license.max_devices,
			currentDevices: existingDevice ? devices.length : devices.length + 1,
			offlineGracePeriod: this.OFFLINE_GRACE_PERIOD,
		};
	}

	/**
	 * Get license by key
	 */
	async getLicense(licenseKey: string): Promise<LicenseInfo | null> {
		const pool = getPostgresPool();
		const result = await pool.query(
			'SELECT * FROM licenses WHERE license_key = $1',
			[licenseKey]
		);

		if (result.rows.length === 0) {
			return null;
		}

		return this.toLicenseInfo(result.rows[0]);
	}

	/**
	 * Get license by user ID
	 */
	async getLicenseByUserId(userId: number): Promise<LicenseInfo | null> {
		const pool = getPostgresPool();
		const result = await pool.query(
			'SELECT * FROM licenses WHERE user_id = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			return null;
		}

		return this.toLicenseInfo(result.rows[0]);
	}

	/**
	 * Update license plan
	 */
	async updateLicensePlan(
		userId: number,
		plan: SubscriptionPlan,
		maxDevices: number
	): Promise<void> {
		const pool = getPostgresPool();
		const features = this.getFeaturesForPlan(plan);

		await pool.query(
			`UPDATE licenses
			 SET plan = $1, max_devices = $2, features = $3, updated_at = NOW()
			 WHERE user_id = $4`,
			[plan, maxDevices, JSON.stringify(features), userId]
		);
	}

	/**
	 * Get device bindings for license
	 */
	async getDeviceBindings(licenseKey: string): Promise<DeviceBinding[]> {
		const pool = getPostgresPool();

		// Get license ID
		const licenseResult = await pool.query(
			'SELECT id FROM licenses WHERE license_key = $1',
			[licenseKey]
		);

		if (licenseResult.rows.length === 0) {
			return [];
		}

		const licenseId = licenseResult.rows[0].id;

		// Get devices
		const devicesResult = await pool.query(
			'SELECT * FROM device_bindings WHERE license_id = $1 ORDER BY last_seen_at DESC',
			[licenseId]
		);

		return devicesResult.rows.map(row => ({
			id: row.id,
			licenseId: row.license_id,
			deviceFingerprint: row.device_fingerprint,
			deviceName: row.device_name,
			lastSeenAt: row.last_seen_at,
			createdAt: row.created_at,
		}));
	}

	/**
	 * Unbind device
	 */
	async unbindDevice(licenseKey: string, deviceFingerprint: string): Promise<void> {
		const pool = getPostgresPool();

		// Get license ID
		const licenseResult = await pool.query(
			'SELECT id FROM licenses WHERE license_key = $1',
			[licenseKey]
		);

		if (licenseResult.rows.length === 0) {
			throw new Error('License not found');
		}

		const licenseId = licenseResult.rows[0].id;

		// Delete device binding
		await pool.query(
			'DELETE FROM device_bindings WHERE license_id = $1 AND device_fingerprint = $2',
			[licenseId, deviceFingerprint]
		);
	}

	/**
	 * Get features for plan
	 */
	private getFeaturesForPlan(plan: SubscriptionPlan): string[] {
		const features: Record<SubscriptionPlan, string[]> = {
			free: ['code-completion', 'code-generation'],
			pro: ['code-completion', 'code-generation', 'code-review', 'scaffolding', 'chat'],
			business: [
				'code-completion',
				'code-generation',
				'code-review',
				'scaffolding',
				'chat',
				'autonomous-pipeline',
				'priority-support',
			],
		};

		return features[plan];
	}

	/**
	 * Convert database row to LicenseInfo
	 */
	private toLicenseInfo(row: any): LicenseInfo {
		const features = typeof row.features === 'string'
			? JSON.parse(row.features)
			: row.features;

		return {
			id: row.id,
			userId: row.user_id,
			licenseKey: row.license_key,
			plan: row.plan,
			maxDevices: row.max_devices,
			features,
			expiresAt: row.expires_at,
			createdAt: row.created_at,
		};
	}
}
