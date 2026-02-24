import { createApp } from './app';
import { config } from './config/env';
import { initPostgres, initRedis, closeDatabases } from './config/database';
import { createMigrationManager } from './config/migration-manager';
import { logger } from './middleware/logger';

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize databases
    await initPostgres();
    await initRedis();

    // Run migrations
    const migrationManager = createMigrationManager();
    await migrationManager.runPending();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server started on port ${config.port}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 API: http://localhost:${config.port}/api/v1`);
      logger.info(`💚 Health: http://localhost:${config.port}/api/v1/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connections
        await closeDatabases();

        logger.info('Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server
startServer();
