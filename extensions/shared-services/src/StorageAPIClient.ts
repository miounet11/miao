import * as vscode from 'vscode';

/**
 * 服务端 Storage API 响应类型定义
 * 与 STORAGE_API_CLIENT_GUIDE.md 文档对齐
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface StorageStatsData {
  totalSize: number;
  totalSizeFormatted: string;
  fileCount: number;
  directoryCount: number;
  oldestFile?: number;
  newestFile?: number;
}

export interface StorageMonitorData {
  timestamp: number;
  stats: Record<string, any>;
  alerts: string[];
  trend: {
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;
    estimatedFullDate?: string;
  };
  recommendations: string[];
}

export interface CleanupResultData {
  success: boolean;
  snapshotsDeleted: number;
  tempFilesDeleted: number;
  errorLogsDeleted: number;
  totalSpaceFreed: number;
  totalSpaceFreedFormatted?: string;
  duration: number;
}

export interface CleanupStatsData {
  oldSnapshotsCount: number;
  oldSnapshotsSize: number;
  oldSnapshotsSizeFormatted: string;
  tempFilesCount: number;
  tempFilesSize: number;
  tempFilesSizeFormatted: string;
  errorLogsCount: number;
  errorLogsSize: number;
  errorLogsSizeFormatted: string;
}

export interface CompressResultData {
  success: boolean;
  snapshotId: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filesCompressed: number;
  duration: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
}

export interface SnapshotData {
  id: string;
  date: string;
  originalSize: number;
  compressedSize: number;
  fileCount: number;
  compressionRatio: number;
  createdAt: number;
  files: string[];
}

export interface StorageHistoryEntry {
  timestamp: number;
  timestampFormatted: string;
  size: number;
  sizeFormatted: string;
}

export interface StorageConfigData {
  compression: {
    sizeThreshold: number;
    timeThreshold?: number;
    targetSize?: number;
    keepRecent?: number;
    compressionLevel: number;
  };
  cleanup: {
    oldSnapshotsAge?: number;
    tempFilesAge?: number;
    errorLogsAge?: number;
    enableAutoCleanup: boolean;
    cleanupInterval: number;
  };
  monitorInterval?: number;
}

/**
 * StorageAPIClient - 对接服务端 /api/v1/storage 接口
 *
 * 基于 STORAGE_API_CLIENT_GUIDE.md 文档实现
 */
export class StorageAPIClient {
  private baseUrl: string;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    const config = vscode.workspace.getConfiguration('miaoda');
    return config.get('cloudUrl', 'https://www.imiaoda.cn');
  }

  private async getToken(): Promise<string | undefined> {
    return this.context.globalState.get<string>('cloudToken');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });
      const data = await response.json() as ApiResponse<T>;
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ===== 1. GET /api/v1/storage/stats =====
  async getStorageStats(): Promise<ApiResponse<StorageStatsData>> {
    return this.request<StorageStatsData>('/api/v1/storage/stats');
  }

  // ===== 2. GET /api/v1/storage/monitor =====
  async getMonitorReport(): Promise<ApiResponse<StorageMonitorData>> {
    return this.request<StorageMonitorData>('/api/v1/storage/monitor');
  }

  // ===== 3. POST /api/v1/storage/cleanup =====
  async triggerCleanup(): Promise<ApiResponse<CleanupResultData>> {
    return this.request<CleanupResultData>('/api/v1/storage/cleanup', {
      method: 'POST',
    });
  }

  // ===== 4. GET /api/v1/storage/cleanup-stats =====
  async getCleanupStats(): Promise<ApiResponse<CleanupStatsData>> {
    return this.request<CleanupStatsData>('/api/v1/storage/cleanup-stats');
  }

  // ===== 5. POST /api/v1/storage/compress =====
  async triggerCompression(dryRun: boolean = false): Promise<ApiResponse<CompressResultData>> {
    return this.request<CompressResultData>('/api/v1/storage/compress', {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    });
  }

  // ===== 6. GET /api/v1/storage/snapshots =====
  async getSnapshots(): Promise<ApiResponse<SnapshotData[]>> {
    return this.request<SnapshotData[]>('/api/v1/storage/snapshots');
  }

  // ===== 7. POST /api/v1/storage/snapshots/:snapshotId/extract =====
  async extractSnapshot(snapshotId: string, targetDir: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}/extract`, {
      method: 'POST',
      body: JSON.stringify({ targetDir }),
    });
  }

  // ===== 8. DELETE /api/v1/storage/snapshots/:snapshotId =====
  async deleteSnapshot(snapshotId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}`, {
      method: 'DELETE',
    });
  }

  // ===== 9. POST /api/v1/storage/snapshots/:snapshotId/verify =====
  async verifySnapshot(snapshotId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}/verify`, {
      method: 'POST',
    });
  }

  // ===== 10. GET /api/v1/storage/history =====
  async getStorageHistory(): Promise<ApiResponse<StorageHistoryEntry[]>> {
    return this.request<StorageHistoryEntry[]>('/api/v1/storage/history');
  }

  // ===== 11. GET /api/v1/storage/config =====
  async getConfig(): Promise<ApiResponse<StorageConfigData>> {
    return this.request<StorageConfigData>('/api/v1/storage/config');
  }

  // ===== 12. PUT /api/v1/storage/config =====
  async updateConfig(config: Partial<StorageConfigData>): Promise<ApiResponse> {
    return this.request('/api/v1/storage/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }
}
