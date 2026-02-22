import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { validateBody, userConfigSchema } from '../utils/validation';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/user/profile
 * Get user profile
 */
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const profile = UserService.getUserProfile(userId);
    if (!profile) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: profile,
    });
  })
);

/**
 * POST /api/v1/user/config
 * Save user configuration
 */
router.post(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Validate request body
    const validation = validateBody(userConfigSchema, req.body);
    if (!validation.success) {
      throw new AppError(400, validation.errors.join(', '));
    }

    // Save config
    try {
      const config = UserService.saveUserConfig(userId, validation.data);

      res.json({
        success: true,
        data: config,
        message: 'Configuration saved successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(400, error.message);
      }
      throw error;
    }
  })
);

/**
 * GET /api/v1/user/config
 * Get user configuration
 */
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
      const config = UserService.getUserConfig(userId);

      if (!config) {
        // Return empty config if none exists
        return res.json({
          success: true,
          data: {},
          message: 'No configuration found',
        });
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(400, error.message);
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/v1/user/config
 * Delete user configuration
 */
router.delete(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const deleted = UserService.deleteUserConfig(userId);

    res.json({
      success: true,
      message: deleted
        ? 'Configuration deleted successfully'
        : 'No configuration to delete',
    });
  })
);

export default router;
