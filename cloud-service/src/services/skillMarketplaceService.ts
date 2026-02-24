import { getPostgresPool } from '../config/database';
import crypto from 'crypto';

/**
 * Skill status
 */
export type SkillStatus = 'pending' | 'approved' | 'blocked';

/**
 * Skill package info
 */
export interface SkillPackage {
	id: number;
	authorId: number;
	name: string;
	description?: string;
	version: string;
	packageUrl: string;
	packageHash: string;
	status: SkillStatus;
	downloadCount: number;
	rating: number;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Skill review
 */
export interface SkillReview {
	id: number;
	skillId: number;
	userId: number;
	rating: number;
	comment?: string;
	createdAt: Date;
}

/**
 * Security scan result
 */
export interface SecurityScanResult {
	issuesFound: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
	details: Array<{
		type: string;
		message: string;
		line?: number;
	}>;
}

/**
 * Skill Marketplace Service
 */
export class SkillMarketplaceService {
	/**
	 * Publish skill
	 */
	async publishSkill(
		authorId: number,
		name: string,
		version: string,
		description: string,
		packageBuffer: Buffer
	): Promise<SkillPackage> {
		const pool = getPostgresPool();

		// Calculate SHA-256 hash
		const packageHash = crypto.createHash('sha256').update(packageBuffer).digest('hex');

		// Upload to object storage (placeholder - implement actual upload)
		const packageUrl = await this.uploadToStorage(packageBuffer, `${name}-${version}.zip`);

		// Create skill package
		const result = await pool.query(
			`INSERT INTO skill_packages (author_id, name, description, version, package_url, package_hash, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING *`,
			[authorId, name, description, version, packageUrl, packageHash, 'pending']
		);

		const skill = this.toSkillPackage(result.rows[0]);

		// Trigger security scan (async)
		setImmediate(async () => {
			try {
				await this.scanForSecurity(skill.id, packageBuffer);
			} catch (error) {
				console.error('Security scan failed:', error);
			}
		});

		return skill;
	}

	/**
	 * Scan for security issues
	 */
	async scanForSecurity(skillId: number, packageBuffer: Buffer): Promise<SecurityScanResult> {
		const pool = getPostgresPool();

		// Extract and scan package content
		const content = packageBuffer.toString('utf-8');

		const issues: Array<{ type: string; message: string; line?: number }> = [];

		// Check for dangerous patterns
		const dangerousPatterns = [
			{ pattern: /eval\s*\(/g, type: 'dangerous_function', message: 'Use of eval() detected' },
			{ pattern: /exec\s*\(/g, type: 'dangerous_function', message: 'Use of exec() detected' },
			{ pattern: /Function\s*\(/g, type: 'dangerous_function', message: 'Use of Function() constructor detected' },
			{ pattern: /require\s*\(['"]child_process['"]/g, type: 'dangerous_module', message: 'Use of child_process detected' },
			{ pattern: /require\s*\(['"]fs['"]/g, type: 'dangerous_module', message: 'Use of fs module detected' },
		];

		for (const { pattern, type, message } of dangerousPatterns) {
			const matches = content.match(pattern);
			if (matches) {
				issues.push({ type, message });
			}
		}

		// Determine severity
		let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
		if (issues.length > 0) {
			if (issues.some(i => i.type === 'dangerous_function')) {
				severity = 'critical';
			} else if (issues.some(i => i.type === 'dangerous_module')) {
				severity = 'high';
			}
		}

		const scanResult: SecurityScanResult = {
			issuesFound: issues.length,
			severity,
			details: issues,
		};

		// Store scan result
		await pool.query(
			`INSERT INTO security_scans (skill_id, scan_result, issues_found, severity)
			 VALUES ($1, $2, $3, $4)`,
			[skillId, JSON.stringify(scanResult), issues.length, severity]
		);

		// Block if critical issues found
		if (severity === 'critical') {
			await pool.query(
				'UPDATE skill_packages SET status = $1 WHERE id = $2',
				['blocked', skillId]
			);
		}

		return scanResult;
	}

	/**
	 * Approve skill (admin only)
	 */
	async approveSkill(skillId: number): Promise<void> {
		const pool = getPostgresPool();
		await pool.query(
			'UPDATE skill_packages SET status = $1, updated_at = NOW() WHERE id = $2',
			['approved', skillId]
		);
	}

	/**
	 * Search skills
	 */
	async searchSkills(
		keyword: string,
		page: number = 1,
		limit: number = 20
	): Promise<{ skills: SkillPackage[]; total: number }> {
		const pool = getPostgresPool();
		const offset = (page - 1) * limit;

		// Search by name or description
		const result = await pool.query(
			`SELECT * FROM skill_packages
			 WHERE status = 'approved'
			   AND (name ILIKE $1 OR description ILIKE $1)
			 ORDER BY download_count DESC, rating DESC
			 LIMIT $2 OFFSET $3`,
			[`%${keyword}%`, limit, offset]
		);

		// Get total count
		const countResult = await pool.query(
			`SELECT COUNT(*) FROM skill_packages
			 WHERE status = 'approved'
			   AND (name ILIKE $1 OR description ILIKE $1)`,
			[`%${keyword}%`]
		);

		return {
			skills: result.rows.map(row => this.toSkillPackage(row)),
			total: parseInt(countResult.rows[0].count, 10),
		};
	}

	/**
	 * Download skill
	 */
	async downloadSkill(skillId: number): Promise<string> {
		const pool = getPostgresPool();

		// Get skill
		const result = await pool.query(
			'SELECT * FROM skill_packages WHERE id = $1 AND status = $2',
			[skillId, 'approved']
		);

		if (result.rows.length === 0) {
			throw new Error('Skill not found or not approved');
		}

		const skill = result.rows[0];

		// Increment download count
		await pool.query(
			'UPDATE skill_packages SET download_count = download_count + 1 WHERE id = $1',
			[skillId]
		);

		// Generate signed temporary download URL (placeholder)
		const downloadUrl = await this.generateSignedUrl(skill.package_url);

		return downloadUrl;
	}

	/**
	 * Submit review
	 */
	async submitReview(
		skillId: number,
		userId: number,
		rating: number,
		comment?: string
	): Promise<SkillReview> {
		const pool = getPostgresPool();

		if (rating < 1 || rating > 5) {
			throw new Error('Rating must be between 1 and 5');
		}

		// Insert or update review
		const result = await pool.query(
			`INSERT INTO skill_reviews (skill_id, user_id, rating, comment)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (skill_id, user_id)
			 DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
			 RETURNING *`,
			[skillId, userId, rating, comment]
		);

		// Update skill average rating
		await this.updateSkillRating(skillId);

		return this.toSkillReview(result.rows[0]);
	}

	/**
	 * Update skill average rating
	 */
	private async updateSkillRating(skillId: number): Promise<void> {
		const pool = getPostgresPool();

		// Calculate average rating
		const result = await pool.query(
			'SELECT AVG(rating) as avg_rating FROM skill_reviews WHERE skill_id = $1',
			[skillId]
		);

		const avgRating = parseFloat(result.rows[0].avg_rating || '0');

		// Update skill
		await pool.query(
			'UPDATE skill_packages SET rating = $1, updated_at = NOW() WHERE id = $2',
			[avgRating, skillId]
		);
	}

	/**
	 * Upload to object storage (placeholder)
	 */
	private async uploadToStorage(buffer: Buffer, filename: string): Promise<string> {
		// TODO: Implement actual S3/MinIO upload
		const url = `https://storage.miaoda.com/skills/${filename}`;
		return url;
	}

	/**
	 * Generate signed download URL (placeholder)
	 */
	private async generateSignedUrl(packageUrl: string): Promise<string> {
		// TODO: Implement actual signed URL generation
		const signedUrl = `${packageUrl}?signature=temp-signature&expires=${Date.now() + 3600000}`;
		return signedUrl;
	}

	/**
	 * Convert database row to SkillPackage
	 */
	private toSkillPackage(row: any): SkillPackage {
		return {
			id: row.id,
			authorId: row.author_id,
			name: row.name,
			description: row.description,
			version: row.version,
			packageUrl: row.package_url,
			packageHash: row.package_hash,
			status: row.status,
			downloadCount: row.download_count,
			rating: parseFloat(row.rating || '0'),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	/**
	 * Convert database row to SkillReview
	 */
	private toSkillReview(row: any): SkillReview {
		return {
			id: row.id,
			skillId: row.skill_id,
			userId: row.user_id,
			rating: row.rating,
			comment: row.comment,
			createdAt: row.created_at,
		};
	}
}
