import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getPostgresPool } from '../config/database';
import { SubscriptionService } from '../services/subscriptionService';

const router = Router();
const subscriptionService = new SubscriptionService();

/**
 * Stripe webhook handler
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
	const sig = req.headers['stripe-signature'];

	if (!sig) {
		return res.status(400).json({ error: 'Missing stripe-signature header' });
	}

	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		return res.status(500).json({ error: 'Webhook secret not configured' });
	}

	let event: Stripe.Event;

	try {
		// Verify webhook signature
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2026-01-28.clover',
		});
		event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
	} catch (error) {
		console.error('Webhook signature verification failed:', error);
		return res.status(400).json({ error: 'Invalid signature' });
	}

	try {
		// Handle event
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
				break;

			case 'invoice.paid':
				await handleInvoicePaid(event.data.object as Stripe.Invoice);
				break;

			case 'invoice.payment_failed':
				await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
				break;

			case 'customer.subscription.updated':
				await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
				break;

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		res.json({ received: true });
	} catch (error) {
		console.error('Webhook handler error:', error);
		res.status(500).json({ error: 'Webhook handler failed' });
	}
});

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
	console.log('Checkout completed:', session.id);

	if (session.mode === 'subscription' && session.subscription) {
		const pool = getPostgresPool();

		// Update subscription status
		await pool.query(
			'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
			['active', session.subscription]
		);
	}
}

/**
 * Handle invoice.paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
	console.log('Invoice paid:', invoice.id);

	if (invoice.subscription && typeof invoice.subscription === 'string') {
		const pool = getPostgresPool();

		// Update subscription status to active
		await pool.query(
			'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
			['active', invoice.subscription]
		);
	}
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
	console.log('Invoice payment failed:', invoice.id);

	if (invoice.subscription && typeof invoice.subscription === 'string') {
		const pool = getPostgresPool();

		// Update subscription status to past_due
		await pool.query(
			'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
			['past_due', invoice.subscription]
		);

		// TODO: Send payment failed notification email
	}
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
	console.log('Subscription updated:', subscription.id);

	const pool = getPostgresPool();

	// Update subscription in database
	const currentPeriodStart = (subscription as any).current_period_start;
	const currentPeriodEnd = (subscription as any).current_period_end;
	const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;

	await pool.query(
		`UPDATE subscriptions
		 SET status = $1,
		     current_period_start = $2,
		     current_period_end = $3,
		     cancel_at_period_end = $4,
		     updated_at = NOW()
		 WHERE stripe_subscription_id = $5`,
		[
			subscription.status,
			currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
			currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
			cancelAtPeriodEnd || false,
			subscription.id,
		]
	);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
	console.log('Subscription deleted:', subscription.id);

	const pool = getPostgresPool();

	// Update subscription status
	await pool.query(
		'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
		['canceled', subscription.id]
	);

	// Get user ID
	const result = await pool.query(
		'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
		[subscription.id]
	);

	if (result.rows.length > 0) {
		const userId = result.rows[0].user_id;

		// Downgrade to free plan
		await pool.query('UPDATE users SET plan = $1 WHERE id = $2', ['free', userId]);
		await pool.query(
			'UPDATE licenses SET plan = $1, max_devices = $2 WHERE user_id = $3',
			['free', 1, userId]
		);
	}
}

/**
 * Create subscription
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
	try {
		const { userId, plan, billingCycle, paymentMethodId } = req.body;

		if (!userId || !plan || !billingCycle || !paymentMethodId) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		const subscription = await subscriptionService.createSubscription(
			userId,
			plan,
			billingCycle,
			paymentMethodId
		);

		res.json(subscription);
	} catch (error) {
		console.error('Create subscription error:', error);
		res.status(500).json({ error: 'Failed to create subscription' });
	}
});

/**
 * Cancel subscription
 */
router.post('/cancel', async (req: Request, res: Response): Promise<void> => {
	try {
		const { userId, immediate } = req.body;

		if (!userId) {
			return res.status(400).json({ error: 'Missing userId' });
		}

		await subscriptionService.cancelSubscription(userId, immediate);

		res.json({ success: true });
	} catch (error) {
		console.error('Cancel subscription error:', error);
		res.status(500).json({ error: 'Failed to cancel subscription' });
	}
});

/**
 * Change plan
 */
router.post('/change-plan', async (req: Request, res: Response): Promise<void> => {
	try {
		const { userId, newPlan, newBillingCycle } = req.body;

		if (!userId || !newPlan || !newBillingCycle) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		const subscription = await subscriptionService.changePlan(
			userId,
			newPlan,
			newBillingCycle
		);

		res.json(subscription);
	} catch (error) {
		console.error('Change plan error:', error);
		res.status(500).json({ error: 'Failed to change plan' });
	}
});

/**
 * Get subscription
 */
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = parseInt(req.params.userId, 10);

		if (isNaN(userId)) {
			return res.status(400).json({ error: 'Invalid userId' });
		}

		const subscription = await subscriptionService.getSubscription(userId);

		if (!subscription) {
			return res.status(404).json({ error: 'Subscription not found' });
		}

		res.json(subscription);
	} catch (error) {
		console.error('Get subscription error:', error);
		res.status(500).json({ error: 'Failed to get subscription' });
	}
});

export default router;
