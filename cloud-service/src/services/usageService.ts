import { getPostgresPool, getRedisClient } from '../config/database';

/**
 * Usage record input
 */
export interface UsageRecordInput {
	userId: number;
	model: string;
	promptTokens: number;
	completionTokens: number;
	latency?: number;
}

/**
 * Usage summary
 */
export interface UsageSummary {
	totalRequests: number;
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	averageLatency: number;
	modelBreakdown: Array<{
		model: string;
		requests: number;
		tokens: number;
	}>;
	period: {
		start: Date;
		end: Date;
	};
}

/**
 * System usage summary
 */
export interface SystemUsageSummary {
	totalUsers: number;
	totalRequests: number;
	totalTokens: number;
	topModels: Array<{
		model: string;
		requests: number;
	}>;
	topUsers: Array<{
		userId: number;
		requests: number;
	}>;
}

/**
 * Usage service
 */
export class UsageService {
	/**
	 * Record usage (async, non-blocking)
	 */
	async recordUsage(input: UsageRecordInput): Promise<void> {
		const pool = getPostgresPool();
		const redis = getRedisClient();

		const totalTokens = input.promptTokens + input.completionTokens;

		// Insert into database (async)
		setImmediate(async () => {
			try {
				await pool.query(
					`INSERT INTO usage_records (user_id, model, prompt_tokens, completion_tokens, total_tokens, latency_ms)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					[input.userId, input.model, input.promptTokens, input.completionTokens, totalTokens, input.latency]
				);
			} catch (error) {
				console.error('Failed to record usage:', error);
			}
		});

		// Update Redis counters (real-time)
		const currentPeriod = this.getCurrentPeriod();
		const userKey = `usage:${input.userId}:${currentPeriod}`;
		const globalKey = `usage:global:${currentPeriod}`;

		try {
			await Promise.all([
				redis.hincrby(userKey, 'requests', 1),
				redis.hincrby(userKey, 'tokens', totalTokens),
				redis.hincrby(globalKey, 'requests', 1),
				redis.hincrby(globalKey, 'tokens', totalTokens),
				redis.expire(userKey, 30 * 24 * 60 * 60), // 30 days
				redis.expire(globalKey, 30 * 24 * 60 * 60),
			]);
		} catch (error) {
			console.error('Failed to update Redis counters:', error);
		}
	}

	/**
	 * Get usage summary for user
	 */
	async getUsageSummary(
		userId: number,
		startDate: Date,
		endDate: Date
	): Promise<UsageSummary> {
		const pool = getPostgresPool();

		// Get total stats
		const totalResult = await pool.query(
			`SELECT
				COUNT(*) as total_requests,
				SUM(total_tokens) as total_tokens,
				SUM(prompt_tokens) as prompt_tokens,
				SUM(completion_tokens) as completion_tokens,
				AVG(latency_ms) as average_latency
			 FROM usage_records
			 WHERE user_id = $1 AND created_at BETWEEN $2 AND $3`,
			[userId, startDate, endDate]
		);

		// Get model breakdown
		const modelResult = await pool.query(
			`SELECT
				model,
				COUNT(*) as requests,
				SUM(total_tokens) as tokens
			 FROM usage_records
			 WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
			 GROUP BY model
			 ORDER BY requests DESC`,
			[userId, startDate, endDate]
		);

		const total = totalResult.rows[0];

		return {
			totalRequests: parseInt(total.total_requests || '0', 10),
			totalTokens: parseInt(total.total_tokens || '0', 10),
			promptTokens: parseInt(total.prompt_tokens || '0', 10),
			completionTokens: parseInt(total.completion_tokens || '0', 10),
			averageLatency: parseFloat(total.average_latency || '0'),
			modelBreakdown: modelResult.rows.map(row => ({
				model: row.model,
				requests: parseInt(row.requests, 10),
				tokens: parseInt(row.tokens, 10),
			})),
			period: {
				start: startDate,
				end: endDate,
			},
		};
	}

	/**
	 * Get current period usage from Redis (real-time)
	 */
	async getCurrentPeriodUsage(userId: number): Promise<{ requests: number; tokens: number }> {
		const redis = getRedisClient();
		const currentPeriod = this.getCurrentPeriod();
		const userKey = `usage:${userId}:${currentPeriod}`;

		try {
			const data = await redis.hgetall(userKey);
			return {
				requests: parseInt(data.requests || '0', 10),
				tokens: parseInt(data.tokens || '0', 10),
			};
		} catch (error) {
			console.error('Failed to get current period usage:', error);
			return { requests: 0, tokens: 0 };
		}
	}

	/**
	 * Get system usage summary (admin only)
	 */
	async getSystemUsageSummary(
		startDate: Date,
		endDate: Date
	): Promise<SystemUsageSummary> {
		const pool = getPostgresPool();

		// Get total stats
		const totalResult = await pool.query(
			`SELECT
				COUNT(DISTINCT user_id) as total_users,
				COUNT(*) as total_requests,
				SUM(total_tokens) as total_tokens
			 FROM usage_records
			 WHERE created_at BETWEEN $1 AND $2`,
			[startDate, endDate]
		);

		// Get top models
		const topModelsResult = await pool.query(
			`SELECT
				model,
				COUNT(*) as requests
			 FROM usage_records
			 WHERE created_at BETWEEN $1 AND $2
			 GROUP BY model
			 ORDER BY requests DESC
			 LIMIT 10`,
			[startDate, endDate]
		);

		// Get top users
		const topUsersResult = await pool.query(
			`SELECT
				user_id,
				COUNT(*) as requests
			 FROM usage_records
			 WHERE created_at BETWEEN $1 AND $2
			 GROUP BY user_id
			 ORDER BY requests DESC
			 LIMIT 10`,
			[startDate, endDate]
		);

		const total = totalResult.rows[0];

		return {
			totalUsers: parseInt(total.total_users || '0', 10),
			totalRequests: parseInt(total.total_requests || '0', 10),
			totalTokens: parseInt(total.total_tokens || '0', 10),
			topModels: topModelsResult.rows.map(row => ({
				model: row.model,
				requests: parseInt(row.requests, 10),
			})),
			topUsers: topUsersResult.rows.map(row => ({
				userId: row.user_id,
				requests: parseInt(row.requests, 10),
			})),
		};
	}

	/**
	 * Get current period key (YYYY-MM format)
	 */
	private getCurrentPeriod(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		return `${year}-${month}`;
	}
}
