import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageService } from '../src/services/storageService';
import { CompressionManager } from '../src/services/compressionManager';
import { CleanupManager } from '../src/services/cleanupManager';
import { StorageMonitor } from '../src/services/storageMonitor';
import { StorageManager } from '../src/services/storageManager';

describe('Storage System', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `miaoda-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('StorageService', () => {
    it('should calculate storage statistics', async () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'a'.repeat(1000));
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'b'.repeat(2000));

      const stats = await StorageService.getStorageStats(testDir);

      expect(stats.totalSize).toBe(3000);
      expect(stats.fileCount).toBe(2);
      expect(stats.directoryCount).toBe(0);
    });

    it('should format bytes correctly', () => {
      expect(StorageService.formatBytes(0)).toBe('0 B');
      expect(StorageService.formatBytes(1024)).toBe('1 KB');
      expect(StorageService.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(StorageService.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should find old files', async () => {
      const oldFile = path.join(testDir, 'old.txt');
      fs.writeFileSync(oldFile, 'old content');

      // Set modification time to 40 days ago
      const oldTime = Date.now() - 40 * 24 * 60 * 60 * 1000;
      fs.utimesSync(oldFile, oldTime / 1000, oldTime / 1000);

      const oldFiles = await StorageService.getOldFiles(testDir, 30);

      expect(oldFiles.length).toBe(1);
      expect(oldFiles[0].path).toBe(oldFile);
    });

    it('should get large files', async () => {
      fs.writeFileSync(path.join(testDir, 'small.txt'), 'small');
      fs.writeFileSync(path.join(testDir, 'large.txt'), 'x'.repeat(10000));

      const largeFiles = await StorageService.getLargeFiles(testDir, 1000);

      expect(largeFiles.length).toBe(1);
      expect(largeFiles[0].path).toContain('large.txt');
    });

    it('should calculate compression ratio', () => {
      const ratio = StorageService.calculateCompressionRatio(1000, 200);
      expect(ratio).toBe(80); // 80% compression
    });

    it('should predict storage trend', () => {
      const data = [
        { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, size: 100 * 1024 * 1024 },
        { timestamp: Date.now(), size: 200 * 1024 * 1024 },
      ];

      const trend = StorageService.predictStorageTrend(data);

      expect(trend.trend).toBe('increasing');
      expect(trend.growthRate).toBeGreaterThan(0);
    });
  });

  describe('CompressionManager', () => {
    it('should initialize compression manager', () => {
      const manager = new CompressionManager(testDir);
      const config = manager.getConfig();

      expect(config.sizeThreshold).toBe(2 * 1024 * 1024 * 1024);
      expect(config.targetSize).toBe(200 * 1024 * 1024);
    });

    it('should determine if compression is needed', async () => {
      const manager = new CompressionManager(testDir);

      // Create old file
      const oldFile = path.join(testDir, 'old.txt');
      fs.writeFileSync(oldFile, 'x'.repeat(1000));

      const oldTime = Date.now() - 40 * 24 * 60 * 60 * 1000;
      fs.utimesSync(oldFile, oldTime / 1000, oldTime / 1000);

      const shouldCompress = await manager.shouldCompress(testDir);
      expect(shouldCompress).toBe(true);
    });

    it('should update compression config', () => {
      const manager = new CompressionManager(testDir);
      manager.updateConfig({ compressionLevel: 5 });

      const config = manager.getConfig();
      expect(config.compressionLevel).toBe(5);
    });
  });

  describe('CleanupManager', () => {
    it('should initialize cleanup manager', () => {
      const manager = new CleanupManager(testDir);
      const config = manager.getConfig();

      expect(config.oldSnapshotsAge).toBe(90 * 24 * 60 * 60 * 1000);
      expect(config.tempFilesAge).toBe(1 * 24 * 60 * 60 * 1000);
    });

    it('should get cleanup statistics', async () => {
      const manager = new CleanupManager(testDir);

      const stats = await manager.getCleanupStats();

      expect(stats.oldSnapshotsCount).toBe(0);
      expect(stats.tempFilesCount).toBe(0);
      expect(stats.errorLogsCount).toBe(0);
    });

    it('should update cleanup config', () => {
      const manager = new CleanupManager(testDir);
      manager.updateConfig({ enableAutoCleanup: false });

      const config = manager.getConfig();
      expect(config.enableAutoCleanup).toBe(false);
    });
  });

  describe('StorageManager', () => {
    it('should initialize storage manager', async () => {
      const manager = new StorageManager(testDir);
      const result = await manager.initialize();

      expect(result.success).toBe(true);
    });

    it('should get storage statistics', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test content');

      const result = await manager.getStorageStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.fileCount).toBeGreaterThan(0);
    });

    it('should get cleanup statistics', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      const result = await manager.getCleanupStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should get snapshots', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      const result = await manager.getSnapshots();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should update configuration', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      const result = manager.updateConfig({
        compression: { compressionLevel: 5 },
      });

      expect(result.success).toBe(true);
    });

    it('should get current configuration', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      const result = manager.getConfig();

      expect(result.success).toBe(true);
      expect(result.data.compression).toBeDefined();
      expect(result.data.cleanup).toBeDefined();
    });

    it('should get historical data', async () => {
      const manager = new StorageManager(testDir);
      await manager.initialize();

      const result = manager.getHistoricalData();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should start and stop manager', async () => {
      const manager = new StorageManager(testDir);

      const startResult = await manager.start();
      expect(startResult.success).toBe(true);

      const stopResult = await manager.stop();
      expect(stopResult.success).toBe(true);
    });
  });
});
