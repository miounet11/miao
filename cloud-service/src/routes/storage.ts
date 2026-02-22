import { Router, Request, Response } from 'express';
import { StorageManager } from '../services/storageManager';
import { authenticate } from '../middleware/auth';

const router = Router();

// Initialize storage manager (in production, this would be a singleton)
let storageManager: StorageManager | null = null;

function getStorageManager(): StorageManager {
  if (!storageManager) {
    const miaodaDir = process.env.MIAODA_DIR || './.miaoda';
    storageManager = new StorageManager(miaodaDir);
  }
  return storageManager;
}

/**
 * GET /api/v1/storage/stats
 * Get current storage statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = await manager.getStorageStats();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get storage statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/storage/monitor
 * Get storage monitor report
 */
router.get('/monitor', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = await manager.getMonitorReport();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get monitor report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/storage/compress
 * Manually trigger compression
 */
router.post('/compress', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const { dryRun } = req.body;

    const result = await manager.compress({ dryRun });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Compression operation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/storage/cleanup
 * Manually trigger cleanup
 */
router.post('/cleanup', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = await manager.cleanup();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cleanup operation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/storage/cleanup-stats
 * Get cleanup statistics
 */
router.get(
  '/cleanup-stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const manager = getStorageManager();
      const result = await manager.getCleanupStats();

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/storage/snapshots
 * Get all snapshots
 */
router.get('/snapshots', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = await manager.getSnapshots();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get snapshots',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/storage/snapshots/:snapshotId/extract
 * Extract a snapshot
 */
router.post(
  '/snapshots/:snapshotId/extract',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const { targetDir } = req.body;

      if (!targetDir) {
        return res.status(400).json({
          success: false,
          message: 'targetDir is required',
        });
      }

      const manager = getStorageManager();
      const result = await manager.extractSnapshot(snapshotId, targetDir);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Snapshot extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/v1/storage/snapshots/:snapshotId
 * Delete a snapshot
 */
router.delete(
  '/snapshots/:snapshotId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const manager = getStorageManager();
      const result = await manager.deleteSnapshot(snapshotId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Snapshot deletion failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/v1/storage/snapshots/:snapshotId/verify
 * Verify snapshot integrity
 */
router.post(
  '/snapshots/:snapshotId/verify',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const manager = getStorageManager();
      const result = await manager.verifySnapshot(snapshotId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Snapshot verification failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/storage/history
 * Get storage historical data
 */
router.get('/history', authenticate, (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = manager.getHistoricalData();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get historical data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/storage/config
 * Get storage configuration
 */
router.get('/config', authenticate, (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = manager.getConfig();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/storage/config
 * Update storage configuration
 */
router.put('/config', authenticate, (req: Request, res: Response) => {
  try {
    const manager = getStorageManager();
    const result = manager.updateConfig(req.body);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
