import * as vscode from 'vscode';

/**
 * 服务端 Storage API 响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface RemoteStorageStats {
  totalSize: number;
  totalSizeFormatted: string;
  fileCount: number;
  directoryCount: number;
}

export interface RemoteMonitorData {
  timestamp: number;
  stats: Record<string, any>;
  alerts: string[];
  trend: {
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;
  };
  recommendations: string[];
}

export interface RemoteCleanupResult {
  success: boolean;
  snapshotsDeleted: number;
  tempFilesDeleted: number;
  errorLogsDeleted: number;
  totalSpaceFreed: number;
  totalSpaceFreedFormatted?: string;
  duration: number;
}

export interface RemoteCleanupStats {
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

export interface RemoteCompressResult {
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

export interface RemoteSnapshot {
  id: string;
  date: string;
  originalSize: number;
  compressedSize: number;
  fileCount: number;
  compressionRatio: number;
  createdAt: number;
  files: string[];
}

export interface RemoteHistoryEntry {
  timestamp: number;
  timestampFormatted: string;
  size: number;
  sizeFormatted: string;
}

export interface RemoteStorageConfig {
  compression: {
    sizeThreshold: number;
    compressionLevel: number;
  };
  cleanup: {
    enableAutoCleanup: boolean;
    cleanupInterval: number;
  };
}

/**
 * StorageAPIClient - 对接服务端 /api/v1/storage 全部 12 个接口
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

  async setToken(token: string): Promise<void> {
    await this.context.globalState.update('cloudToken', token);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      return await response.json() as ApiResponse<T>;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  /** 1. GET /api/v1/storage/stats */
  async getStats(): Promise<ApiResponse<RemoteStorageStats>> {
    return this.request<RemoteStorageStats>('/api/v1/storage/stats');
  }

  /** 2. GET /api/v1/storage/monitor */
  async getMonitor(): Promise<ApiResponse<RemoteMonitorData>> {
    return this.request<RemoteMonitorData>('/api/v1/storage/monitor');
  }

  /** 3. POST /api/v1/storage/cleanup */
  async triggerCleanup(): Promise<ApiResponse<RemoteCleanupResult>> {
    return this.request<RemoteCleanupResult>('/api/v1/storage/cleanup', { method: 'POST' });
  }

  /** 4. GET /api/v1/storage/cleanup-stats */
  async getCleanupStats(): Promise<ApiResponse<RemoteCleanupStats>> {
    return this.request<RemoteCleanupStats>('/api/v1/storage/cleanup-stats');
  }

  /** 5. POST /api/v1/storage/compress */
  async triggerCompress(dryRun = false): Promise<ApiResponse<RemoteCompressResult>> {
    return this.request<RemoteCompressResult>('/api/v1/storage/compress', {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    });
  }

  /** 6. GET /api/v1/storage/snapshots */
  async getSnapshots(): Promise<ApiResponse<RemoteSnapshot[]>> {
    return this.request<RemoteSnapshot[]>('/api/v1/storage/snapshots');
  }

  /** 7. POST /api/v1/storage/snapshots/:id/extract */
  async extractSnapshot(snapshotId: string, targetDir: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}/extract`, {
      method: 'POST',
      body: JSON.stringify({ targetDir }),
    });
  }

  /** 8. DELETE /api/v1/storage/snapshots/:id */
  async deleteSnapshot(snapshotId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}`, { method: 'DELETE' });
  }

  /** 9. POST /api/v1/storage/snapshots/:id/verify */
  async verifySnapshot(snapshotId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/storage/snapshots/${snapshotId}/verify`, { method: 'POST' });
  }

  /** 10. GET /api/v1/storage/history */
  async getHistory(): Promise<ApiResponse<RemoteHistoryEntry[]>> {
    return this.request<RemoteHistoryEntry[]>('/api/v1/storage/history');
  }

  /** 11. GET /api/v1/storage/config */
  async getConfig(): Promise<ApiResponse<RemoteStorageConfig>> {
    return this.request<RemoteStorageConfig>('/api/v1/storage/config');
  }

  /** 12. PUT /api/v1/storage/config */
  async updateConfig(config: Partial<RemoteStorageConfig>): Promise<ApiResponse> {
    return this.request('/api/v1/storage/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /** 检测服务端是否可达 */
  async isAvailable(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/storage/stats`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      return resp.status !== 0;
    } catch {
      return false;
    }
  }
}
