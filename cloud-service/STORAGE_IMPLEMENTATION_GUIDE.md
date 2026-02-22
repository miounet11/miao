# Storage System Implementation Guide

## Quick Start

### 1. Installation

```bash
cd /Users/lu/ide/miaoda-ide/cloud-service
npm install
```

The `tar` package will be installed as a dependency for compression operations.

### 2. Basic Usage

```typescript
import { StorageManager } from './src/services/storageManager';

// Initialize
const manager = new StorageManager('./.miaoda');
await manager.initialize();

// Start background services
await manager.start();

// Get storage stats
const stats = await manager.getStorageStats();
console.log(`Total size: ${stats.data.totalSizeFormatted}`);

// Stop services
await manager.stop();
```

### 3. API Integration

The storage routes are automatically integrated into the Express app:

```typescript
// In src/app.ts, storage routes are mounted at /api/v1/storage
// All endpoints require authentication
```

## File Structure

```
cloud-service/
├── src/
│   ├── services/
│   │   ├── storageService.ts          # Low-level storage utilities
│   │   ├── compressionManager.ts      # Compression logic
│   │   ├── cleanupManager.ts          # Cleanup logic
│   │   ├── storageMonitor.ts          # Monitoring & alerts
│   │   └── storageManager.ts          # Main orchestrator
│   ├── routes/
│   │   ├── storage.ts                 # Storage API endpoints
│   │   └── index.ts                   # Route registration
│   └── ...
├── tests/
│   └── storage.test.ts                # Comprehensive tests
├── STORAGE_SYSTEM.md                  # Full documentation
└── package.json                       # Updated with tar dependency
```

## Component Details

### StorageService

**Purpose:** Low-level file system operations and statistics.

**Key Methods:**
- `getStorageStats(dirPath)` - Calculate storage statistics
- `getOldFiles(dirPath, days)` - Find files older than N days
- `getLargeFiles(dirPath, minSize)` - Find large files
- `formatBytes(bytes)` - Format bytes to human-readable
- `predictStorageTrend(data)` - Predict storage growth
- `calculateCompressionRatio(original, compressed)` - Calculate ratio

**Example:**
```typescript
const stats = await StorageService.getStorageStats('./.miaoda');
console.log(`Files: ${stats.fileCount}`);
console.log(`Size: ${StorageService.formatBytes(stats.totalSize)}`);
```

### CompressionManager

**Purpose:** Intelligent compression with snapshot management.

**Configuration:**
```typescript
const manager = new CompressionManager('./.miaoda', {
  sizeThreshold: 2 * 1024 * 1024 * 1024,  // 2GB
  timeThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
  targetSize: 200 * 1024 * 1024,           // 200MB
  keepRecent: 7 * 24 * 60 * 60 * 1000,     // 7 days
  compressionLevel: 9                      // Max compression
});
```

**Key Methods:**
- `shouldCompress(miaodaDir)` - Check if compression needed
- `compressOldData(miaodaDir, options)` - Compress old files
- `getSnapshots()` - List all snapshots
- `extractSnapshot(snapshotId, targetDir)` - Extract snapshot
- `deleteSnapshot(snapshotId)` - Delete snapshot
- `verifySnapshot(snapshotId)` - Verify integrity

**Snapshot Metadata:**
```typescript
interface SnapshotMetadata {
  id: string;                    // Unique ID
  date: string;                  // Date (YYYY-MM-DD)
  originalSize: number;          // Original size in bytes
  compressedSize: number;        // Compressed size in bytes
  fileCount: number;             // Number of files
  compressionRatio: number;      // Compression ratio %
  createdAt: number;             // Creation timestamp
  files: string[];               // List of files in snapshot
}
```

### CleanupManager

**Purpose:** Automatic cleanup of old data.

**Configuration:**
```typescript
const manager = new CleanupManager('./.miaoda', {
  oldSnapshotsAge: 90 * 24 * 60 * 60 * 1000,  // 90 days
  tempFilesAge: 1 * 24 * 60 * 60 * 1000,      // 1 day
  errorLogsAge: 30 * 24 * 60 * 60 * 1000,     // 30 days
  enableAutoCleanup: true,                     // Enable auto cleanup
  cleanupInterval: 60 * 60 * 1000              // 1 hour
});
```

**Key Methods:**
- `startAutoCleanup()` - Start automatic cleanup
- `stopAutoCleanup()` - Stop automatic cleanup
- `runCleanup()` - Manual cleanup
- `getCleanupStats()` - Get cleanup statistics

**Cleanup Report:**
```typescript
interface CleanupReport {
  success: boolean;
  snapshotsDeleted: number;
  tempFilesDeleted: number;
  errorLogsDeleted: number;
  totalSpaceFreed: number;
  duration: number;              // milliseconds
  error?: string;
}
```

### StorageMonitor

**Purpose:** Real-time monitoring with alerts and predictions.

**Key Methods:**
- `startMonitoring()` - Start monitoring
- `stopMonitoring()` - Stop monitoring
- `checkStorage()` - Manual check
- `getReport()` - Get current report
- `getHistoricalData()` - Get historical data

**Monitor Report:**
```typescript
interface StorageMonitorReport {
  timestamp: number;
  stats: StorageStats;
  alerts: StorageAlert[];        // Critical, warning, info
  trend: {
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;          // bytes/day
    estimatedFullDate?: Date;    // When storage will be full
  };
  recommendations: string[];     // Action recommendations
}
```

### StorageManager

**Purpose:** Main orchestrator combining all components.

**Initialization:**
```typescript
const manager = new StorageManager('./.miaoda', {
  compression: { compressionLevel: 9 },
  cleanup: { enableAutoCleanup: true },
  monitorInterval: 60 * 60 * 1000  // 1 hour
});

await manager.initialize();
await manager.start();
```

**Key Methods:**
- `initialize()` - Initialize manager
- `start()` - Start all services
- `stop()` - Stop all services
- `getStorageStats()` - Get statistics
- `compress(options)` - Manual compression
- `cleanup()` - Manual cleanup
- `getMonitorReport()` - Get monitor report
- `getSnapshots()` - List snapshots
- `extractSnapshot(id, dir)` - Extract snapshot
- `deleteSnapshot(id)` - Delete snapshot
- `verifySnapshot(id)` - Verify snapshot
- `getConfig()` - Get configuration
- `updateConfig(config)` - Update configuration

## API Endpoints

### Storage Statistics
```
GET /api/v1/storage/stats
```
Authentication required.

### Storage Monitor
```
GET /api/v1/storage/monitor
```
Get alerts, trends, and recommendations.

### Compression
```
POST /api/v1/storage/compress
Body: { "dryRun": false }
```

### Cleanup
```
POST /api/v1/storage/cleanup
```

### Snapshots
```
GET /api/v1/storage/snapshots
POST /api/v1/storage/snapshots/:id/extract
DELETE /api/v1/storage/snapshots/:id
POST /api/v1/storage/snapshots/:id/verify
```

### Configuration
```
GET /api/v1/storage/config
PUT /api/v1/storage/config
```

## Testing

### Run Tests
```bash
npm test -- tests/storage.test.ts
```

### Test Coverage
```bash
npm test -- tests/storage.test.ts --coverage
```

### Test Structure
- StorageService tests
- CompressionManager tests
- CleanupManager tests
- StorageManager integration tests

## Configuration Examples

### Conservative (Small Projects)
```typescript
const manager = new StorageManager('./.miaoda', {
  compression: {
    sizeThreshold: 500 * 1024 * 1024,      // 500MB
    timeThreshold: 14 * 24 * 60 * 60 * 1000, // 14 days
    targetSize: 50 * 1024 * 1024,          // 50MB
    keepRecent: 3 * 24 * 60 * 60 * 1000    // 3 days
  },
  cleanup: {
    oldSnapshotsAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    tempFilesAge: 12 * 60 * 60 * 1000,         // 12 hours
    errorLogsAge: 7 * 24 * 60 * 60 * 1000      // 7 days
  }
});
```

### Aggressive (Large Projects)
```typescript
const manager = new StorageManager('./.miaoda', {
  compression: {
    sizeThreshold: 5 * 1024 * 1024 * 1024,     // 5GB
    timeThreshold: 60 * 24 * 60 * 60 * 1000,   // 60 days
    targetSize: 500 * 1024 * 1024,             // 500MB
    keepRecent: 14 * 24 * 60 * 60 * 1000       // 14 days
  },
  cleanup: {
    oldSnapshotsAge: 180 * 24 * 60 * 60 * 1000, // 180 days
    tempFilesAge: 7 * 24 * 60 * 60 * 1000,      // 7 days
    errorLogsAge: 90 * 24 * 60 * 60 * 1000      // 90 days
  }
});
```

## Performance Tuning

### Compression Performance
- Compression level 9: Maximum compression, slower
- Compression level 6: Balanced (recommended)
- Compression level 1: Fast, less compression

### Monitoring Interval
- 1 hour: Default, good for most cases
- 30 minutes: More frequent monitoring
- 4 hours: Less frequent, lower overhead

### Cleanup Interval
- 1 hour: Default, good balance
- 30 minutes: More aggressive cleanup
- 24 hours: Daily cleanup

## Troubleshooting

### High Memory Usage
1. Reduce compression level
2. Increase cleanup interval
3. Reduce monitoring interval
4. Check for large files

### Slow Compression
1. Reduce compression level
2. Compress smaller batches
3. Use dry-run to estimate time
4. Check disk I/O

### Snapshot Corruption
1. Verify snapshot: `POST /api/v1/storage/snapshots/:id/verify`
2. Delete corrupted snapshot
3. Re-compress data
4. Check disk health

### Cleanup Not Running
1. Check if auto-cleanup is enabled
2. Verify cleanup interval
3. Check error logs
4. Manually trigger: `POST /api/v1/storage/cleanup`

## Best Practices

1. **Regular Monitoring**
   - Check storage stats weekly
   - Review alerts promptly
   - Monitor trends

2. **Backup Strategy**
   - Keep recent snapshots (7+ days)
   - Archive important snapshots
   - Test restoration regularly

3. **Configuration**
   - Adjust thresholds based on usage
   - Set appropriate cleanup intervals
   - Monitor compression ratios

4. **Maintenance**
   - Verify snapshots monthly
   - Clean up old snapshots
   - Review error logs

## Integration with Miaoda IDE

### Extension Integration
```typescript
// In Miaoda IDE extension
import { StorageManager } from 'miaoda-cloud-service';

const manager = new StorageManager(miaodaDir);
await manager.start();

// Show storage stats in UI
const stats = await manager.getStorageStats();
showStorageIndicator(stats.data.totalSizeFormatted);

// Show alerts
const report = await manager.getMonitorReport();
if (report.data.alerts.length > 0) {
  showAlerts(report.data.alerts);
}