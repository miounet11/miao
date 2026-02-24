import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('./data/miaoda.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX: z.string().default('100'),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('15m'),
  AUTH_RATE_LIMIT_MAX: z.string().default('5'),
  LOG_LEVEL: z.string().default('info'),
  CONFIG_CACHE_TTL: z.string().default('3600'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Environment validation error:', error);
    }
    process.exit(1);
  }
};

export const env = parseEnv();

// Export typed config object
export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiry: env.JWT_EXPIRY,
  },
  cors: {
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  },
  rateLimit: {
    windowMs: parseDuration(env.RATE_LIMIT_WINDOW),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
  },
  authRateLimit: {
    windowMs: parseDuration(env.AUTH_RATE_LIMIT_WINDOW),
    max: parseInt(env.AUTH_RATE_LIMIT_MAX, 10),
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  cache: {
    configTTL: parseInt(env.CONFIG_CACHE_TTL, 10),
  },
};

/**
 * Parse duration string to milliseconds
 * Supports: 1s, 1m, 1h, 1d
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}
