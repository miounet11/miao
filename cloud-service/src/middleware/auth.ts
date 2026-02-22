import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT authentication middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof Error) {
      next(new AppError(401, error.message));
    } else {
      next(new AppError(401, 'Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      req.user = payload;
    }
    next();
  } catch {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Require specific membership tier
 */
export function requireMembership(
  ...allowedTiers: Array<'free' | 'pro' | 'enterprise'>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!allowedTiers.includes(req.user.membership as any)) {
      return next(
        new AppError(
          403,
          `This feature requires ${allowedTiers.join(' or ')} membership`
        )
      );
    }

    next();
  };
}
