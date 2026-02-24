import { getRedisClient } from '../config/database';
import type { SubscriptionPlan } from './subscriptionService';

/**
 * Quota limits by plan
 */
const QUOTA_LIMITS: Record<SubscriptionPlan, number> = {
	free: 50,
	pro: 500,
	business: -1, // Unlimited
};

/**
 * Quota check result
 */
export interface QuotaCheckResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: Date;
	upgradeSuggestion?: string;
}

/**
 * Quota service with Redis Lua atomic operations
 */
export class QuotaService {
	private readonly QUOTA_WINDOW = 30 * 24 * 60 * 60; // 30 days in seconds

	/**
	 * Check if user has quota available
	 */
	async checkQuota(userId: number, plan: SubscriptionPlan): Promise<QuotaCheckResult> {
		const redis = getRedisClient();
		const key = `quota:${userId}`;
		const limit = QUOTA_LIMITS[plan];

		// Unlimited for business plan
		if (limit === -1) {
			return {
				allowed: true,
				remaining: -1,
				limit: -1,
				resetAt: new Date(Date.now() + this.QUOTA_WINDOW * 1000),
			};
		}

		// Get current usage
		const used = await redis.get(key);
		const usedCount = used ? parseInt(used, 10) : 0;

		// Get TTL
		const ttl = await redis.ttl(key);
		const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.QUOTA_WINDOW * 1000));

		const remaining = Math.max(0, limit - usedCount);
		const allowed = remaining > 0;

		const result: QuotaCheckResult = {
			allowed,
			remaining,
			limit,
			resetAt,
		};

		if (!allowed) {
			result.upgradeSuggestion = this.getUpgradeSuggestion(plan);
		}

		return result;
	}

	/**
	 * Consume quota atomically using Lua script
	 */
	async consumeQuota(userId: number, plan: SubscriptionPlan, amount: number = 1): Promise<QuotaCheckResult> {
		const redis = getRedisClient();
		const key = `quota:${userId}`;
		const limit = QUOTA_LIMITS[plan];

		// Unlimited for business plan
		if (limit === -1) {
			return {
				allowed: true,
				remaining: -1,
				limit: -1,
				resetAt: new Date(Date.now() + this.QUOTA_WINDOW * 1000),
			};
		}

		// Lua script for atomic check and consume
		const luaScript = `
			local key = KEYS[1]
			local limit = tonumber(ARGV[1])
			local amount = tonumber(ARGV[2])
			local window = tonumber(ARGV[3])

			local current = tonumber(redis.call('GET', key) or '0')

			if current + amount <= limit then
				local new_value = redis.call('INCRBY', key, amount)
				if current == 0 then
					redis.call('EXPIRE', key, window)
				end
				return {1, new_value, limit - new_value}
			else
				return {0, current, limit - current}
			end
		`;

		// Execute Lua script
		const result = await redis.eval(
			luaScript,
			1,
			key,
			limit.toString(),
			amount.toString(),
			this.QUOTA_WINDOW.toString()
		) as [number, number, number];

		const [allowed, used, remaining] = result;

		// Get TTL
		const ttl = await redis.ttl(key);
		const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.QUOTA_WINDOW * 1000));

		const quotaResult: QuotaCheckResult = {
			allowed: allowed === 1,
			remaining: Math.max(0, remaining),
			limit,
			resetAt,
		};

		if (!quotaResult.allowed) {
			quotaResult.upgradeSuggestion = this.getUpgradeSuggestion(plan);
		}

		return quotaResult;
	}

	/**
	 * Get current quota usage
	 */
	async getUsage(userId: number, plan: SubscriptionPlan): Promise<{ used: number; limit: number; remaining: number }> {
		const redis = getRedisClient();
		const key = `quota:${userId}`;
		const limit = QUOTA_LIMITS[plan];

		if (limit === -1) {
			return { used: 0, limit: -1, remaining: -1 };
		}

		const used = await redis.get(key);
		const usedCount = used ? parseInt(used, 10) : 0;
		const remaining = Math.max(0, limit - usedCount);

		return { used: usedCount, limit, remaining };
	}

	/**
	 * Reset quota for user
	 */
	async resetQuota(userId: number): Promise<void> {
		const redis = getRedisClient();
		const key = `quota:${userId}`;
		await redis.del(key);
	}

	/**
	 * Get upgrade suggestion
	 */
	private getUpgradeSuggestion(currentPlan: SubscriptionPlan): string {
		switch (currentPlan) {
			case 'free':
				return 'Upgrade to Pro for 500 requests/month or Business for unlimited requests.';
			case 'pro':
				return 'Upgrade to Business for unlimited requests.';
			case 'business':
				return '';
		}
	}
}
