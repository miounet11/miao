import Stripe from 'stripe';
import { getPostgresPool } from '../config/database';

/**
 * Subscription plan
 */
export type SubscriptionPlan = 'free' | 'pro' | 'business';

/**
 * Billing cycle
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

/**
 * Subscription info
 */
export interface SubscriptionInfo {
	id: number;
	userId: number;
	plan: SubscriptionPlan;
	billingCycle?: BillingCycle;
	status: SubscriptionStatus;
	currentPeriodStart?: Date;
	currentPeriodEnd?: Date;
	cancelAtPeriodEnd: boolean;
}

/**
 * Subscription service
 */
export class SubscriptionService {
	private stripe: Stripe;

	constructor() {
		const apiKey = process.env.STRIPE_SECRET_KEY;
		if (!apiKey) {
			throw new Error('STRIPE_SECRET_KEY not configured');
		}
		this.stripe = new Stripe(apiKey, {
			apiVersion: '2026-01-28.clover',
		});
	}

	/**
	 * Create subscription
	 */
	async createSubscription(
		userId: number,
		plan: SubscriptionPlan,
		billingCycle: BillingCycle,
		paymentMethodId: string
	): Promise<SubscriptionInfo> {
		const pool = getPostgresPool();

		// Get or create Stripe customer
		const customer = await this.getOrCreateCustomer(userId);

		// Attach payment method
		await this.stripe.paymentMethods.attach(paymentMethodId, {
			customer: customer.id,
		});

		// Set as default payment method
		await this.stripe.customers.update(customer.id, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		// Get price ID for plan
		const priceId = this.getPriceId(plan, billingCycle);

		// Create Stripe subscription
		const stripeSubscription = await this.stripe.subscriptions.create({
			customer: customer.id,
			items: [{ price: priceId }],
			expand: ['latest_invoice.payment_intent'],
		});

		// Store subscription in database
		const result = await pool.query(
			`INSERT INTO subscriptions (
				user_id, stripe_customer_id, stripe_subscription_id, plan, billing_cycle, status,
				current_period_start, current_period_end, cancel_at_period_end
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *`,
			[
				userId,
				customer.id,
				stripeSubscription.id,
				plan,
				billingCycle,
				stripeSubscription.status,
				new Date(stripeSubscription.current_period_start * 1000),
				new Date(stripeSubscription.current_period_end * 1000),
				false,
			]
		);

		// Update user plan
		await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId]);

		// Update license
		const maxDevices = this.getMaxDevices(plan);
		await pool.query(
			'UPDATE licenses SET plan = $1, max_devices = $2 WHERE user_id = $3',
			[plan, maxDevices, userId]
		);

		return this.toSubscriptionInfo(result.rows[0]);
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(userId: number, immediate: boolean = false): Promise<void> {
		const pool = getPostgresPool();

		// Get subscription
		const result = await pool.query(
			'SELECT * FROM subscriptions WHERE user_id = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			throw new Error('No active subscription found');
		}

		const subscription = result.rows[0];

		if (immediate) {
			// Cancel immediately
			await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);

			// Update database
			await pool.query(
				'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE user_id = $2',
				['canceled', userId]
			);

			// Downgrade to free
			await pool.query('UPDATE users SET plan = $1 WHERE id = $2', ['free', userId]);
			await pool.query(
				'UPDATE licenses SET plan = $1, max_devices = $2 WHERE user_id = $3',
				['free', 1, userId]
			);
		} else {
			// Cancel at period end
			await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
				cancel_at_period_end: true,
			});

			await pool.query(
				'UPDATE subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE user_id = $1',
				[userId]
			);
		}
	}

	/**
	 * Change subscription plan
	 */
	async changePlan(
		userId: number,
		newPlan: SubscriptionPlan,
		newBillingCycle: BillingCycle
	): Promise<SubscriptionInfo> {
		const pool = getPostgresPool();

		// Get current subscription
		const result = await pool.query(
			'SELECT * FROM subscriptions WHERE user_id = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			throw new Error('No active subscription found');
		}

		const subscription = result.rows[0];

		// Get new price ID
		const newPriceId = this.getPriceId(newPlan, newBillingCycle);

		// Update Stripe subscription
		const stripeSubscription = await this.stripe.subscriptions.retrieve(
			subscription.stripe_subscription_id
		);

		const updatedSubscription = await this.stripe.subscriptions.update(
			subscription.stripe_subscription_id,
			{
				items: [
					{
						id: stripeSubscription.items.data[0].id,
						price: newPriceId,
					},
					],
				proration_behavior: 'create_prorations',
			}
		);

		// Update database
		const updateResult = await pool.query(
			`UPDATE subscriptions
			 SET plan = $1, billing_cycle = $2, updated_at = NOW()
			 WHERE user_id = $3
			 RETURNING *`,
			[newPlan, newBillingCycle, userId]
		);

		// Update user plan
		await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [newPlan, userId]);

		// Update license
		const maxDevices = this.getMaxDevices(newPlan);
		await pool.query(
			'UPDATE licenses SET plan = $1, max_devices = $2 WHERE user_id = $3',
			[newPlan, maxDevices, userId]
		);

		return this.toSubscriptionInfo(updateResult.rows[0]);
	}

	/**
	 * Get subscription info
	 */
	async getSubscription(userId: number): Promise<SubscriptionInfo | null> {
		const pool = getPostgresPool();
		const result = await pool.query(
			'SELECT * FROM subscriptions WHERE user_id = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			return null;
		}

		return this.toSubscriptionInfo(result.rows[0]);
	}

	/**
	 * Get or create Stripe customer
	 */
	private async getOrCreateCustomer(userId: number): Promise<Stripe.Customer> {
		const pool = getPostgresPool();

		// Check if customer exists
		const result = await pool.query(
			'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
			[userId]
		);

		if (result.rows.length > 0 && result.rows[0].stripe_customer_id) {
			return await this.stripe.customers.retrieve(result.rows[0].stripe_customer_id) as Stripe.Customer;
		}

		// Get user email
		const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
		const email = userResult.rows[0].email;

		// Create new customer
		return await this.stripe.customers.create({
			email,
			metadata: { userId: userId.toString() },
		});
	}

	/**
	 * Get Stripe price ID for plan
	 */
	private getPriceId(plan: SubscriptionPlan, billingCycle: BillingCycle): string {
		const priceMap: Record<string, string> = {
			'pro-monthly': process.env.STRIPE_PRICE_PRO_MONTHLY || '',
			'pro-yearly': process.env.STRIPE_PRICE_PRO_YEARLY || '',
			'business-monthly': process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
			'business-yearly': process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
		};

		const key = `${plan}-${billingCycle}`;
		const priceId = priceMap[key];

		if (!priceId) {
			throw new Error(`Price ID not configured for ${key}`);
		}

		return priceId;
	}

	/**
	 * Get max devices for plan
	 */
	private getMaxDevices(plan: SubscriptionPlan): number {
		switch (plan) {
			case 'free':
				return 1;
			case 'pro':
				return 3;
			case 'business':
				return 10;
		}
	}

	/**
	 * Convert database row to SubscriptionInfo
	 */
	private toSubscriptionInfo(row: any): SubscriptionInfo {
		return {
			id: row.id,
			userId: row.user_id,
			plan: row.plan,
			billingCycle: row.billing_cycle,
			status: row.status,
			currentPeriodStart: row.current_period_start,
			currentPeriodEnd: row.current_period_end,
			cancelAtPeriodEnd: row.cancel_at_period_end,
		};
	}
}
