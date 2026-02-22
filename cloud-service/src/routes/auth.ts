import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateBody, loginSchema, registerSchema } from '../utils/validation';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateBody(registerSchema, req.body);
    if (!validation.success) {
      throw new AppError(400, validation.errors.join(', '));
    }

    const { email, password } = validation.data;

    // Register user
    const result = await AuthService.register({ email, password });

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateBody(loginSchema, req.body);
    if (!validation.success) {
      throw new AppError(400, validation.errors.join(', '));
    }

    const { email, password } = validation.data;

    // Login user
    try {
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(401, error.message);
      }
      throw error;
    }
  })
);

export default router;
