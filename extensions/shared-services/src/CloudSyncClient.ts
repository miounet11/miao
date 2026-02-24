import * as vscode from 'vscode';
import { QuotaInfo, UsageRecord } from './QuotaManager';

/**
 * 云端同步客户端
 *
 * 功能：
 * 1. 同步额度信息到云端
 * 2. 同步使用记录
 * 3. 跨设备配置同步
 */
export class CloudSyncClient {
  private context: vscode.ExtensionContext;
  private cloudUrl: string;
  private deviceId: string;
  private syncEnabled: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.cloudUrl = this.getCloudUrl();
    this.deviceId = this.getDeviceId();
    this.syncEnabled = this.getSyncEnabled();
  }

  /**
   * 获取云端 URL
   */
  private getCloudUrl(): string {
    const config = vscode.workspace.getConfiguration('miaoda');
    return config.get('cloudUrl', 'https://www.imiaoda.cn');
  }

  /**
   * 获取设备 ID
   */
  private getDeviceId(): string {
    let deviceId = this.context.globalState.get<string>('deviceId');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      this.context.globalState.update('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * 生成设备 ID
   */
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取同步开关
   */
  private getSyncEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('miaoda');
    return config.get('cloudSync.enabled', false);
  }

  /**
   * 启用云端同步
   */
  async enableSync(): Promise<boolean> {
    const email = await vscode.window.showInputBox({
      prompt: '输入邮箱以启用云端同步',
      placeHolder: 'your@email.com',
      validateInput: (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : '请输入有效的邮箱';
      },
    });

    if (!email) return false;

    try {
      // 注册/登录
      const response = await this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, deviceId: this.deviceId }),
      });

      if (response.ok) {
        const data: any = await response.json();
        await this.context.globalState.update('cloudToken', data.token);
        await this.context.globalState.update('cloudEmail', email);
        this.syncEnabled = true;

        vscode.window.showInformationMessage('✅ 云端同步已启用');
        return true;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`云端同步启用失败: ${error}`);
    }

    return false;
  }

  /**
   * 同步额度信息
   */
  async syncQuota(quota: QuotaInfo): Promise<void> {
    if (!this.syncEnabled) return;

    try {
      await this.request('/api/quota/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: this.deviceId,
          quota,
        }),
      });
    } catch (error) {
      console.error('Quota sync failed:', error);
    }
  }

  /**
   * 同步使用记录
   */
  async syncUsage(records: UsageRecord[]): Promise<void> {
    if (!this.syncEnabled) return;

    try {
      await this.request('/api/usage/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: this.deviceId,
          records,
        }),
      });
    } catch (error) {
      console.error('Usage sync failed:', error);
    }
  }

  /**
   * 获取云端额度信息
   */
  async getCloudQuota(): Promise<QuotaInfo | null> {
    if (!this.syncEnabled) return null;

    try {
      const response = await this.request('/api/quota');
      if (response.ok) {
        return await response.json() as QuotaInfo;
      }
    } catch (error) {
      console.error('Get cloud quota failed:', error);
    }

    return null;
  }

  /**
   * 获取使用统计
   */
  async getCloudStats(days: number = 7): Promise<any> {
    if (!this.syncEnabled) return null;

    try {
      const response = await this.request(`/api/quota/stats?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Get cloud stats failed:', error);
    }

    return null;
  }

  /**
   * 发送请求
   */
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const token = this.context.globalState.get<string>('cloudToken');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${this.cloudUrl}${path}`, {
      ...options,
      headers,
    });
  }

  /**
   * 检查同步状态
   */
  isSyncEnabled(): boolean {
    return this.syncEnabled;
  }
}
