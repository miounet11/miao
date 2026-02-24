import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { config } from '../config/env';

const router = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  try {
    // Check database connection
    const result = db().query('SELECT 1 as health').get() as { health: number };

    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      database: result.health === 1 ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };

    res.json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Service unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
