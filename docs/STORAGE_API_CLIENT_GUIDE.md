# 存储系统 API 对接文档 (Storage System API Integration Guide)

本文档面向客户端开发人员，详细说明了如何对接和调用服务端提供的本地存储管理系统 API。

## 基础信息 (Base Info)

- **基础路径 (Base URL)**: `/api/v1/storage`
- **认证方式 (Authentication)**: 所有接口均需要认证（如需使用，请在请求头中携带 `Authorization: Bearer <Token>`）

---

## 接口详情 (API Endpoints)

### 1. 存储状态统计 (Storage Statistics)
获取当前存储系统的统计信息，如文件数量、总占用大小等。

- **请求方式**: `GET /api/v1/storage/stats`
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "data": {
      "totalSize": 104857600,
      "totalSizeFormatted": "100 MB",
      "fileCount": 1500,
      "directoryCount": 50
    }
  }
  ```

### 2. 存储监控报告 (Storage Monitor)
获取当前存储系统的监控报警、趋势分析和建议。

- **请求方式**: `GET /api/v1/storage/monitor`
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "data": {
      "timestamp": 1678901234567,
      "stats": { /* ... */ },
      "alerts": [],
      "trend": {
        "trend": "increasing",
        "growthRate": 1024000
      },
      "recommendations": ["建议清理过期文件"]
    }
  }
  ```

### 3. 触发存储清理 (Manual Cleanup)
手动触发存储系统清理任务（删除临时文件、过期日志及过期快照）。

- **请求方式**: `POST /api/v1/storage/cleanup`
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "snapshotsDeleted": 2,
      "tempFilesDeleted": 100,
      "errorLogsDeleted": 5,
      "totalSpaceFreed": 52428800,
      "duration": 1500
    }
  }
  ```

### 4. 获取清理统计 (Cleanup Statistics)
获取历史清理任务的统计信息。

- **请求方式**: `GET /api/v1/storage/cleanup-stats`
- **请求参数**: 无

### 5. 触发数据压缩 (Manual Compression)
手动触发旧数据的压缩以释放空间。

- **请求方式**: `POST /api/v1/storage/compress`
- **请求体 (JSON)**:
  ```json
  {
    "dryRun": false // 是否仅测试运行（不实际压缩）
  }
  ```

### 6. 获取快照列表 (List Snapshots)
获取已生成的压缩快照列表。

- **请求方式**: `GET /api/v1/storage/snapshots`
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "snap_123456789",
        "date": "2023-10-01",
        "originalSize": 104857600,
        "compressedSize": 20971520,
        "fileCount": 100,
        "compressionRatio": 80,
        "createdAt": 1678901234567,
        "files": ["file1.txt", "file2.txt"]
      }
    ]
  }
  ```

### 7. 提取/恢复快照 (Extract Snapshot)
将指定快照解压恢复到目标目录。

- **请求方式**: `POST /api/v1/storage/snapshots/:snapshotId/extract`
- **路径参数**:
  - `snapshotId`: 快照 ID
- **请求体 (JSON)**:
  ```json
  {
    "targetDir": "/path/to/extract" // 目标解压目录
  }
  ```

### 8. 删除快照 (Delete Snapshot)
删除指定的快照。

- **请求方式**: `DELETE /api/v1/storage/snapshots/:snapshotId`
- **路径参数**:
  - `snapshotId`: 快照 ID

### 9. 验证快照完整性 (Verify Snapshot)
校验指定快照的完整性。

- **请求方式**: `POST /api/v1/storage/snapshots/:snapshotId/verify`
- **路径参数**:
  - `snapshotId`: 快照 ID

### 10. 存储历史数据 (Storage History)
获取存储容量和文件数量的历史记录数据，适用于图表绘制。

- **请求方式**: `GET /api/v1/storage/history`
- **请求参数**: 无

### 11. 获取存储配置 (Get Configuration)
获取当前存储系统的压缩和清理规则配置。

- **请求方式**: `GET /api/v1/storage/config`
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "data": {
      "compression": {
        "sizeThreshold": 2147483648,
        "compressionLevel": 9
      },
      "cleanup": {
        "enableAutoCleanup": true,
        "cleanupInterval": 3600000
      }
    }
  }
  ```

### 12. 更新存储配置 (Update Configuration)
修改存储系统的运行配置。

- **请求方式**: `PUT /api/v1/storage/config`
- **请求体 (JSON)**:
  ```json
  {
    "compression": {
      "compressionLevel": 6
    },
    "cleanup": {
      "enableAutoCleanup": false
    }
  }
  ```

---

## 错误处理 (Error Handling)
当请求出错时，将返回 HTTP `500` 或相应的错误状态码，结构如下：
```json
{
  "success": false,
  "message": "Failed to get storage statistics",
  "error": "Error details here"
}
```
