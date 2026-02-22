import { Router, Request, Response } from 'express';
import { ConfigService } from '../services/configService';
import { validateBody, modelConfigQuerySchema } from '../utils/validation';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/config/models
 * Get model configurations based on membership tier
 * Public endpoint with optional authentication
 */
router.get(
  '/models',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validateBody(modelConfigQuerySchema, req.query);
    if (!validation.success) {
      throw new AppError(400, validation.errors.join(', '));
    }

    // Determine membership tier
    let membership = validation.data.membership;

    // If authenticated, use user's membership tier
    if (req.user && !membership) {
      membership = req.user.membership as 'free' | 'pro' | 'enterprise';
    }

    // Get model configs
    const configs = ConfigService.getModelConfigs(membership);

    res.json({
      success: true,
      data: configs,
      meta: {
        count: configs.length,
        membership: membership || 'all',
      },
    });
  })
);

/**
 * GET /api/v1/config/models/:id
 * Get single model configuration by ID
 */
router.get(
  '/models/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid model ID');
    }

    const config = ConfigService.getModelConfigById(id);
    if (!config) {
      throw new AppError(404, 'Model configuration not found');
    }

    res.json({
      success: true,
      data: config,
    });
  })
);

export default router;
