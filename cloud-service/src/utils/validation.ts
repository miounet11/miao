import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register request validation schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * User config validation schema
 */
export const userConfigSchema = z.object({
  theme: z.string().optional(),
  fontSize: z.number().min(8).max(32).optional(),
  models: z.array(z.string()).optional(),
  customSettings: z.record(z.unknown()).optional(),
});

/**
 * Membership tier validation
 */
export const membershipSchema = z.enum(['free', 'pro', 'enterprise']);

/**
 * Query params for model configs
 */
export const modelConfigQuerySchema = z.object({
  membership: membershipSchema.optional(),
});

/**
 * Validate request body against schema
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
