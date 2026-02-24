import { Router, Request, Response } from 'express';
import { LLMProxyService } from '../services/llmProxyService';
import { verifyToken } from '../utils/jwt-rs256';

const router = Router();
const llmProxyService = new LLMProxyService();

/**
 * Retry configuration
 */
const RETRY_STATUS_CODES = [429, 500, 502, 503];
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

/**
 * Exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
	return BASE_DELAY * Math.pow(2, attempt);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract user ID from JWT
 */
function getUserIdFromToken(req: Request): number {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Missing or invalid authorization header');
	}

	const token = authHeader.substring(7);
	const payload = verifyToken(token);
	return payload.userId;
}

/**
 * Complete (non-streaming) endpoint
 */
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = getUserIdFromToken(req);
		const request = req.body;

		if (!request.model || !request.messages) {
			res.status(400).json({ error: 'Missing required fields: model, messages' });
			return;
		}

		// Retry logic with exponential backoff
		let lastError: any;
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				const response = await llmProxyService.complete(userId, request);
				res.json(response);
				return;
			} catch (error: any) {
				lastError = error;

				// Check if error is retryable
				const statusCode = error.statusCode || error.cause?.statusCode || 500;
				const isRetryable = RETRY_STATUS_CODES.includes(statusCode);

				if (!isRetryable || attempt === MAX_RETRIES) {
					break;
				}

				// Wait before retry
				const delay = getRetryDelay(attempt);
				console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
				await sleep(delay);
			}
		}

		// All retries failed
		const statusCode = lastError.statusCode || lastError.cause?.statusCode || 500;
		res.status(statusCode).json({
			error: lastError.message,
			...(lastError.quotaInfo ? { quotaInfo: lastError.quotaInfo } : {}),
		});
	} catch (error: any) {
		console.error('LLM complete error:', error);
		res.status(error.statusCode || 500).json({ error: error.message });
	}
});

/**
 * Stream endpoint with SSE
 */
router.post('/stream', async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = getUserIdFromToken(req);
		const request = req.body;

		if (!request.model || !request.messages) {
			return res.status(400).json({ error: 'Missing required fields: model, messages' });
		}

		// Set SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		// Retry logic with exponential backoff
		let lastError: any;
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				// Stream response
				for await (const chunk of llmProxyService.stream(userId, request)) {
					res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
				}

				// Send done event
				res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
				res.end();
				return;
			} catch (error: any) {
				lastError = error;

				// Check if error is retryable
				const statusCode = error.statusCode || error.cause?.statusCode || 500;
				const isRetryable = RETRY_STATUS_CODES.includes(statusCode);

				if (!isRetryable || attempt === MAX_RETRIES) {
					break;
				}

				// Wait before retry
				const delay = getRetryDelay(attempt);
				console.log(`Stream retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
				await sleep(delay);
			}
		}

		// All retries failed - send error event
		res.write(`data: ${JSON.stringify({ error: lastError.message })}\n\n`);
		res.end();
	} catch (error: any) {
		console.error('LLM stream error:', error);
		if (!res.headersSent) {
			res.status(error.statusCode || 500).json({ error: error.message });
		} else {
			res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
			res.end();
		}
	}
});

/**
 * Get available models for user
 */
router.get('/models', async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = getUserIdFromToken(req);

		// Get user plan
		const { getPostgresPool } = await import('../config/database');
		const pool = getPostgresPool();
		const result = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		const plan = result.rows[0].plan;

		// Return allowed models based on plan
		const models: Record<string, string[]> = {
			free: ['gpt-3.5-turbo', 'claude-3-5-haiku-20241022'],
			pro: [
				'gpt-3.5-turbo',
				'gpt-4o-mini',
				'claude-3-5-haiku-20241022',
				'claude-3-5-sonnet-20241022',
			],
			business: [
				'gpt-3.5-turbo',
				'gpt-4o-mini',
				'gpt-4o',
				'claude-3-5-haiku-20241022',
				'claude-3-5-sonnet-20241022',
				'claude-opus-4-20250514',
			],
		};

		res.json({ plan, models: models[plan] || [] });
	} catch (error: any) {
		console.error('Get models error:', error);
		res.status(error.statusCode || 500).json({ error: error.message });
	}
});

export default router;
