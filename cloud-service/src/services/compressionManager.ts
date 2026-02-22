import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tar from 'tar';
import { StorageService } from './storageService';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  sizeThreshold: number; // bytes (default: 2GB)
  timeThreshold: number; // milliseconds (default: 30 days)
  targetSize: number; // bytes (default: 200MB)
  keepRecent: number; // milliseconds (default: 7 days)
  compressionLevel: number; // 1-9 (default: 9)
}

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  id: string;
  date: string;
  originalSize: number;
  compressedSize: number;
  fileCount: number;
  compressionRatio: number;
  createdAt: number;
  files: string[];
}

/**
 * Compression report
 */
export interface CompressionReport {
  success: boolean;
  snapshotId: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filesCompressed: number;
  duration: number; // milliseconds
  error?: string;
}

/**
 * Intelligent compression manager
 */
export class CompressionManager {
  private config: CompressionConfig;
  private snapshotsDir: string;
  private metadataFile: string;

  constructor(miaodaDir: string, config?: Partial<CompressionConfig>) {
    this.snapshotsDir = path.join(miaodaDir, 'history', 'snapshots');
    this.metadataFile = path.join(this.snapshotsDir, '.metadata.json');

    // Default configuration
    this.config = {
      sizeThreshold: 2 * 1024 * 1024 * 1024, // 2GB
      timeThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
      targetSize: 200 * 1024 * 1024, // 200MB
      keepRecent: 7 * 24 * 60 * 60 * 1000, // 7 days
      compressionLevel: 9,
      ...config,
    };

    this.ensureSnapshotsDir();
  }

  /**
   * Ensure snapshots directory exists
   */
  private ensureSnapshotsDir(): void {
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  /**
   * Check if compression is needed
   */
  async shouldCompress(miaodaDir: string): Promise<boolean> {
    const stats = await StorageService.getStorageStats(miaodaDir);

    // Rule 1: Size exceeds threshold
    if (stats.totalSize > this.config.sizeThreshold) {
      return true;
    }

    // Rule 2: Data older than time threshold exists
    const cutoffTime = Date.now() - this.config.timeThreshold;
    if (stats.oldestFile > 0 && stats.oldestFile < cutoffTime) {
      return true;
    }

    return false;
  }

  /**
   * Compress old data
   */
  async compressOldData(
    miaodaDir: string,
    options?: { dryRun?: boolean }
  ): Promise<CompressionReport> {
    const startTime = Date.now();
    const dryRun = options?.dryRun || false;

    try {
      // Find old files (older than keepRecent)
      const cutoffTime = Date.now() - this.config.keepRecent;
      const oldFiles = await StorageService.getOldFiles(
        miaodaDir,
        this.config.keepRecent / (24 * 60 * 60 * 1000)
      );

      if (oldFiles.length === 0) {
        return {
          success: true,
          snapshotId: '',
          originalSize: 0,
          compressedSize: 0,
          compressionRatio: 0,
          filesCompressed: 0,
          duration: Date.now() - startTime,
        };
      }

      // Group files by date
      const groupedByDate = this.groupFilesByDate(oldFiles);

      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      let totalFilesCompressed = 0;

      // Compress each group
      for (const [date, files] of groupedByDate) {
        const originalSize = files.reduce((sum, f) => sum + f.size, 0);
        totalOriginalSize += originalSize;

        if (!dryRun) {
          const result = await this.createSnapshot(date, files, miaodaDir);
          totalCompressedSize += result.compressedSize;
          totalFilesCompressed += files.length;

          // Delete original files
          for (const file of files) {
            try {
              fs.unlinkSync(file.path);
            } catch (err) {
              console.error(`Failed to delete ${file.path}:`, err);
            }
          }
        }
      }

      const compressionRatio = StorageService.calculateCompressionRatio(
        totalOriginalSize,
        totalCompressedSize
      );

      return {
        success: true,
        snapshotId: `snapshot-${Date.now()}`,
        originalSize: totalOriginalSize,
        compressedSize: totalCompressedSize,
        compressionRatio,
        filesCompressed: totalFilesCompressed,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        snapshotId: '',
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        filesCompressed: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a snapshot for a date
   */
  private async createSnapshot(
    date: string,
    files: Array<{ path: string; size: number }>,
    miaodaDir: string
  ): Promise<{ snapshotPath: string; compressedSize: number }> {
    const snapshotId = `${date}-${Date.now()}`;
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.tar.gz`);

    // Create tar.gz archive
    const output = fs.createWriteStream(snapshotPath);
    const gzip = zlib.createGzip({ level: this.config.compressionLevel });

    // Use tar to create archive
    const tarStream = tar.create(
      {
        gzip: false,
        cwd: miaodaDir,
      },
      files.map((f) => path.relative(miaodaDir, f.path))
    );

    await new Promise<void>((resolve, reject) => {
      tarStream
        .pipe(gzip)
        .pipe(output)
        .on('finish', resolve)
        .on('error', reject);
    });

    const stats = fs.statSync(snapshotPath);
    const originalSize = files.reduce((sum, f) => sum + f.size, 0);

    // Save metadata
    this.saveSnapshotMetadata({
      id: snapshotId,
      date,
      originalSize,
      compressedSize: stats.size,
      fileCount: files.length,
      compressionRatio: StorageService.calculateCompressionRatio(
        originalSize,
        stats.size
      ),
      createdAt: Date.now(),
      files: files.map((f) => f.path),
    });

    return {
      snapshotPath,
      compressedSize: stats.size,
    };
  }

  /**
   * Group files by date
   */
  private groupFilesByDate(
    files: Array<{ path: string; mtime: number; size: number }>
  ): Map<string, Array<{ path: string; size: number }>> {
    const grouped = new Map<string, Array<{ path: string; size: number }>>();

    for (const file of files) {
      const date = new Date(file.mtime).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push({ path: file.path, size: file.size });
    }

    return grouped;
  }

  /**
   * Save snapshot metadata
   */
  private saveSnapshotMetadata(metadata: SnapshotMetadata): void {
    let allMetadata: SnapshotMetadata[] = [];

    if (fs.existsSync(this.metadataFile)) {
      try {
        allMetadata = JSON.parse(fs.readFileSync(this.metadataFile, 'utf-8'));
      } catch (err) {
        console.error('Failed to read metadata file:', err);
      }
    }

    allMetadata.push(metadata);
    fs.writeFileSync(this.metadataFile, JSON.stringify(allMetadata, null, 2));
  }

  /**
   * Get all snapshots
   */
  async getSnapshots(): Promise<SnapshotMetadata[]> {
    if (!fs.existsSync(this.metadataFile)) {
      return [];
    }

    try {
      return JSON.parse(fs.readFileSync(this.metadataFile, 'utf-8'));
    } catch (err) {
      console.error('Failed to read snapshots:', err);
      return [];
    }
  }

  /**
   * Extract snapshot
   */
  async extractSnapshot(
    snapshotId: string,
    targetDir: string
  ): Promise<boolean> {
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.tar.gz`);

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    try {
      await tar.extract({
        file: snapshotPath,
        cwd: targetDir,
      });
      return true;
    } catch (error) {
      console.error('Failed to extract snapshot:', error);
      return false;
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.tar.gz`);

    if (!fs.existsSync(snapshotPath)) {
      return false;
    }

    try {
      fs.unlinkSync(snapshotPath);

      // Remove from metadata
      let metadata = await this.getSnapshots();
      metadata = metadata.filter((m) => m.id !== snapshotId);
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));

      return true;
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      return false;
    }
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshot(snapshotId: string): Promise<boolean> {
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.tar.gz`);

    if (!fs.existsSync(snapshotPath)) {
      return false;
    }

    try {
      // Try to list contents
      const files: string[] = [];
      await tar.list({
        file: snapshotPath,
        onentry: (entry) => {
          files.push(entry.name);
        },
      });

      return files.length > 0;
    } catch (error) {
      console.error('Snapshot verification failed:', error);
      return false;
    }
  }

  /**
   * Update compression config
   */
  updateConfig(config: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): CompressionConfig {
    return { ...this.config };
  }
}
