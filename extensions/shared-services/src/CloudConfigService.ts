/**
 * Cloud Configuration Service
 * Handles communication with Miaoda cloud backend
 */

import { CloudConfigResponse, MembershipTier } from './ModelConfigSchema';

export interface CloudServiceOptions {
  endpoint: string;
  timeout?: number;
  retryAttempts?: number;
  userAgent?: string;
}

export interface UserSession {
  userId?: string;
  sessionToken?: string;
  membership: MembershipTier;
}

/**
 * Cloud Configuration Service
 */
export class CloudConfigService {
  private endpoint: string;
  private timeout: number;
  private retryAttempts: number;
  private userAgent: string;
  private session: UserSession;

  constructor(options: CloudServiceOptions) {
    this.endpoint = options.endpoint;
    this.timeout = options.timeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.userAgent = options.userAgent || 'Miaoda-IDE/0.1.0';
    this.session = { membership: 'free' };
  }

  /**
   * Fetch model configurations from cloud
   */
  async fetchModels(): Promise<CloudConfigResponse> {
    const url = `${this.endpoint}/models?membership=${this.session.membership}`;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.makeRequest(url, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as CloudConfigResponse;
        return data;
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw new Error(`Failed to fetch cloud config after ${this.retryAttempts} attempts: ${error}`);
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Failed to fetch cloud config');
  }

  /**
   * Authenticate user session
   */
  async authenticate(credentials: { email?: string; token?: string }): Promise<UserSession> {
    const url = `${this.endpoint}/auth`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data: any = await response.json();
      this.session = {
        userId: data.userId,
        sessionToken: data.sessionToken,
        membership: data.membership || 'free'
      };

      return this.session;
    } catch (error) {
      throw new Error(`Authentication error: ${error}`);
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; version?: string; message?: string }> {
    const url = `${this.endpoint}/health`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data: any = await response.json();
      return {
        status: 'ok',
        version: data.version,
        message: data.message
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Report usage metrics (anonymous)
   */
  async reportUsage(metrics: {
    modelId: string;
    tokensUsed: number;
    latency: number;
    success: boolean;
  }): Promise<void> {
    const url = `${this.endpoint}/metrics`;

    try {
      await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...metrics,
          timestamp: Date.now(),
          userId: this.session.userId || 'anonymous'
        })
      });
    } catch (error) {
      // Silently fail - metrics are not critical
      console.debug('Failed to report usage metrics:', error);
    }
  }

  /**
   * Get current session
   */
  getSession(): UserSession {
    return { ...this.session };
  }

  /**
   * Set session (for testing or manual configuration)
   */
  setSession(session: UserSession): void {
    this.session = session;
  }

  /**
   * Clear session (logout)
   */
  clearSession(): void {
    this.session = { membership: 'free' };
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent
    };

    if (this.session.sessionToken) {
      headers['Authorization'] = `Bearer ${this.session.sessionToken}`;
    }

    return headers;
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock cloud service for development/testing
 */
export class MockCloudConfigService extends CloudConfigService {

  constructor() {
    super({
      endpoint: 'http://localhost:3000/api/v1/config',
      timeout: 5000
    });
  }

  async fetchModels(): Promise<CloudConfigResponse> {
    // Simulate network delay
    await this.delay(500);

    return {
      models: [
        {
          id: 'mock-gpt-3.5',
          name: 'GPT-3.5 Turbo (Mock)',
          nameCN: 'GPT-3.5 Turbo (模拟)',
          provider: 'openai',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo',
          maxTokens: 4096,
          streaming: true,
          membership: 'free',
          source: 'cloud',
          enabled: true,
          contextWindow: 4096,
          supportsFunctions: true,
          description: 'Mock model for testing',
          descriptionCN: '用于测试的模拟模型'
        },
        {
          id: 'mock-gpt-4',
          name: 'GPT-4 (Mock)',
          nameCN: 'GPT-4 (模拟)',
          provider: 'openai',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-4',
          maxTokens: 8192,
          streaming: true,
          membership: 'pro',
          source: 'cloud',
          enabled: true,
          contextWindow: 8192,
          supportsFunctions: true,
          supportsVision: true,
          description: 'Mock GPT-4 for testing',
          descriptionCN: '用于测试的模拟 GPT-4'
        }
      ],
      updated_at: Date.now(),
      cache_ttl: 3600,
      membership: this.getSession().membership
    };
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; version?: string; message?: string }> {
    return {
      status: 'ok',
      version: '1.0.0-mock',
      message: 'Mock service is running'
    };
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
