# Miaoda Storage System - Compression & Cleanup

## Overview

The Miaoda Storage System provides intelligent compression, automatic cleanup, and real-time monitoring for the `.miaoda/` project directory. It ensures efficient storage usage while maintaining data integrity and recovery capabilities.

## Architecture

### Core Components

#### 1. StorageService
Low-level storage utilities for file operations and statistics.

**Key Features:**
- Calculate storage statistics (size, file count, age)
- Find old files and large files
- Format bytes to human-readable format
- Predict storage trends
- Calculate compression ratios

**Usage:**
```typescript
import { StorageService } from './services/storageService';

const stats = await StorageService.getStorageStats('./.miaoda');
const oldFiles = await StorageService.getOldFiles('./.miaoda', 30); // 30 days
const largeFiles = await StorageService.getLargeFiles('./.miaoda', 10 * 1024 * 1024); // 10MB+
```

#### 2. CompressionManager
Intelligent compression with smart algorithms and snapshot management.

**Configuration:**
```typescript
interface CompressionConfig {
  sizeThreshold: number;      // Default: 2GB
  timeThreshold: number;      // Default: 30 days
  targetSize: number;         // Default: 200MB
  keepRecent: number;         // Default: 7 days
  compressionLevel: number;   // 1-9 (default: 9)
}
```

**Features:**
- Automatic compression when size or age thresholds are exceeded
- Smart compression algorithm (prioritizes large files)
- Date-based grouping and archiving
- Snapshot metadata tracking
- Snapshot extraction and verification
- Data integrity validation

**Usage:**
```typescript
const manager = new CompressionManager('./.miaoda');

// Check if compression is needed
const shouldCompress = await manager.shouldCompress('./.miaoda');

// Compress old data
const report = await manager.compressOldData('./.miaoda');
console.log(`Compressed ${report.filesCompressed} files`);
console.log(`Compression ratio: ${report.compressionRatio}%`);

// Get snapshots
const snapshots = await manager.getSnapshots();

// Extract snapshot
await manager.extractSnapshot('snapshot-id', '/target/dir');

// Verify snapshot
const isValid = await manager.verifySnapshot('snapshot-id');
```

#### 3. CleanupManager
Automatic cleanup of old snapshots, temp files, and error logs.

**Configuration:**
```typescript
interface CleanupConfig {
  oldSnapshotsAge: number;    // Default: 90 days
  tempFilesAge: number;       // Default: 1 day
  errorLogsAge: number;       // Default: 30 days
  enableAutoCleanup: boolean; // Default: true
  cleanupInterval: number;    // Default: 1 hour
}
```

**Features:**
- Automatic cleanup on configurable intervals
- Selective cleanup (snapshots, temp files, error logs)
- Metadata cleanup
- Space freed tracking
- Cleanup statistics

**Usage:**
```typescript
const manager = new CleanupManager('./.miaoda');

// Start automatic cleanup
manager.startAutoCleanup();

// Manual cleanup
const report = await manager.runCleanup();
console.log(`Freed ${StorageService.formatBytes(report.totalSpaceFreed)}`);

// Get cleanup statistics
const stats = await manager.getCleanupStats();
console.log(`Old snapshots: ${stats.oldSnapshotsCount}`);

// Stop cleanup
manager.stopAutoCleanup();
```

#### 4. StorageMonitor
Real-time storage monitoring with alerts and trend prediction.

**Features:**
- Continuous storage monitoring
- Alert generation (critical, warning, info)
- Storage trend prediction
- Growth rate calculation
- Estimated full date prediction
- Historical data tracking
- Smart recommendations

**Usage:**
```typescript
const monitor = new StorageMonitor('./.miaoda', compressionManager, cleanupManager);

// Start monitoring
monitor.startMonitoring();

// Get report
const report = await monitor.checkStorage();
console.log(`Alerts: ${report.alerts.length}`);
console.log(`Trend: ${report.trend.trend}`);
console.log(`Recommendations: ${report.recommendations}`);

// Get historical data
const history = monitor.getHistoricalData();
```

#### 5. StorageManager
Main orchestrator combining all components.

**Usage:**
```typescript
const manager = new StorageManager('./.miaoda');

// Initialize
await manager.initialize();

// Start all services
await manager.start();

// Get statistics
const stats = await manager.getStorageStats();

// Manual compression
const compressResult = await manager.compress();

// Manual cleanup
const cleanupResult = await manager.cleanup();

// Get monitor report
const report = await manager.getMonitorReport();

// Stop all services
await manager.stop();
```

## API Endpoints

### Storage Statistics
```
GET /api/v1/storage/stats
```
Get current storage statistics.

**Response:**
```json
{
  "success": true,
  "message": "Storage statistics retrieved",
  "data": {
    "totalSize": 1073741824,
    "totalSizeFormatted": "1 GB",
    "fileCount": 5000,
    "directoryCount": 50,
    "oldestFile": 1708000000000,
    "newestFile": 1708500000000
  }
}
```

### Storage Monitor
```
GET /api/v1/storage/monitor
```
Get storage monitor report with alerts and recommendations.

**Response:**
```json
{
  "success": true,
  "message": "Storage monitor report retrieved",
  "data": {
    "timestamp": 1708500000000,
    "stats": { ... },
    "alerts": [
      {
        "type": "warning",
        "message": "Storage is approaching limit",
        "timestamp": 1708500000000,
        "suggestedAction": "Consider compressing old data"
      }
    ],
    "trend": {
      "trend": "increasing",
      "growthRate": 52428800,
      "estimatedFullDate": "2026-03-21T10:00:00.000Z"
    },
    "recommendations": [
      "Schedule compression for old data",
      "Review and clean up temporary files"
    ]
  }
}
```

### Compression
```
POST /api/v1/storage/compress
```
Manually trigger compression.

**Request Body:**
```json
{
  "dryRun": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Compression completed successfully",
  "data": {
    "snapshotId": "snapshot-1708500000000",
    "originalSize": 2147483648,
    "originalSizeFormatted": "2 GB",
    "compressedSize": 209715200,
    "compressedSizeFormatted": "200 MB",
    "compressionRatio": 90.2,
    "filesCompressed": 5000,
    "duration": 45000
  }
}
```

### Cleanup
```
POST /api/v1/storage/cleanup
```
Manually trigger cleanup.

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "data": {
    "snapshotsDeleted": 5,
    "tempFilesDeleted": 120,
    "errorLogsDeleted": 8,
    "totalSpaceFreed": 104857600,
    "totalSpaceFreedFormatted": "100 MB",
    "duration": 5000
  }
}
```

### Cleanup Statistics
```
GET /api/v1/storage/cleanup-stats
```
Get cleanup statistics.

**Response:**
```json
{
  "success": true,
  "message": "Cleanup statistics retrieved",
  "data": {
    "oldSnapshotsCount": 10,
    "oldSnapshotsSize": 1073741824,
    "oldSnapshotsSizeFormatted": "1 GB",
    "tempFilesCount": 500,
    "tempFilesSize": 52428800,
    "tempFilesSizeFormatted": "50 MB",
    "errorLogsCount": 20,
    "errorLogsSize": 10485760,
    "errorLogsSizeFormatted": "10 MB"
  }
}
```

### Snapshots
```
GET /api/v1/storage/snapshots
```
Get all snapshots.

**Response:**
```json
{
  "success": true,
  "message": "Snapshots retrieved",
  "data": [
    {
      "id": "2026-02-21-1708500000000",
      "date": "2026-02-21",
      "originalSize": 2147483648,
      "originalSizeFormatted": "2 GB",
      "compressedSize": 209715200,
      "compressedSizeFormatted": "200 MB",
      "fileCount": 5000,
      "compressionRatio": 90.2,
      "createdAt": 1708500000000,
      "createdAtFormatted": "2/21/2026, 10:00:00 AM",
      "files": ["file1.txt", "file2.txt", ...]
    }
  ]
}
```

### Extract Snapshot
```
POST /api/v1/storage/snapshots/:snapshotId/extract
```
Extract a snapshot to a target directory.

**Request Body:**
```json
{
  "targetDir": "/path/to/target"
}
```

### Delete Snapshot
```
DELETE /api/v1/storage/snapshots/:snapshotId
```
Delete a snapshot.

### Verify Snapshot
```
POST /api/v1/storage/snapshots/:snapshotId/verify
```
Verify snapshot integrity.

**Response:**
```json
{
  "success": true,
  "message": "Snapshot is valid",
  "data": {
    "snapshotId": "2026-02-21-1708500000000",
    "isValid": true
  }
}
```

### Storage History
```
GET /api/v1/storage/history
```
Get historical storage data.

**Response:**
```json
{
  "success": true,
  "message": "Historical data retrieved",
  "data": [
    {
      "timestamp": 1708400000000,
      "timestampFormatted": "2/21/2026, 6:00:00 AM",
      "size": 1073741824,
      "sizeFormatted": "1 GB"
    },
    {
      "timestamp": 1708500000000,
      "timestampFormatted": "2/21/2026, 10:00:00 AM",
      "size": 1207959552,
      "sizeFormatted": "1.12 GB"
    }
  ]
}
```

### Configuration
```
GET /api/v1/storage/config
```
Get current storage configuration.

```
PUT /api/v1/storage/config
```
Update storage configuration.

**Request Body:**
```json
{
  "compression": {
    "sizeThreshold": 2147483648,
    "compressionLevel": 9
  },
  "cleanup": {
    "oldSnapshotsAge": 7776000000,
    "enableAutoCleanup": true
  },
  "monitorInterval": 3600000
}