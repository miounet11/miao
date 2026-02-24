import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';

/**
 * Database configuration interface
 */
export interface IDatabaseConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
}

const dbConfig: IDatabaseConfig = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'miaoda',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'miaoda:',
  },
};

let pgPool: Pool | null = null;
let redisClient: Redis | null = null;

/**
 * Initialize PostgreSQL connection pool
 */
export async function initPostgres(): Promise<Pool> {
  if (pgPool) {
    return pgPool;
  }

  pgPool = new Pool(dbConfig.postgres);

  // Test connection
  try {
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL connected');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }

  return pgPool;
}

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<Redis> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: dbConfig.redis.host,
    port: dbConfig.redis.port,
    password: dbConfig.redis.password,
    db: dbConfig.redis.db,
    keyPrefix: dbConfig.redis.keyPrefix,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('error', (error) => {
    console.error('❌ Redis error:', error);
  });

  await new Promise<void>((resolve, reject) => {
    redisClient!.once('ready', () => {
      console.log('✅ Redis connected');
      resolve();
    });
    redisClient!.once('error', reject);
  });

  return redisClient;
}

/**
 * Get PostgreSQL pool instance
 */
export function getPostgresPool(): Pool {
  if (!pgPool) {
    throw new Error('PostgreSQL not initialized. Call initPostgres() first.');
  }
  return pgPool;
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Execute a PostgreSQL transaction
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all database connections
 */
export async function closeDatabases(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    console.log('✅ PostgreSQL connection closed');
  }

  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Database instance getter
 */
export function db(): Pool {
  return getPostgresPool();
}
