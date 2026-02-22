/**
 * Configuration Manager for Miaoda IDE
 * Implements 3-tier configuration system:
 * 1. Cloud Defaults (Official)
 * 2. User Custom (Override)
 * 3. Quick Presets (Templates)
 */

import {
  ModelConfig,
  CloudConfigResponse,
  UserModelConfig,
  ValidationResult,
  MembershipTier,
  PROVIDER_PRESETS,
  DEFAULT_CLOUD_MODELS,
  ProviderPreset
} from './ModelConfigSchema';
import { KeychainService } from './KeychainService';

export interface ConfigurationManagerOptions {
  cloudEndpoint?: string;
  cacheTTL?: number;
  enableCloudSync?: boolean;
}

/**
 * Configuration Manager
 * Manages model configurations from multiple sources
 */
export class ConfigurationManager {
  private cloudModels: ModelConfig[] = [];
  private userConfig: UserModelConfig = {
    customModels: [],
    disabledCloudModels: []
  };
  private cloudEndpoint: string;
  private cacheTTL: number;
  private enableCloudSync: boolean;
  private lastCloudFetch: number = 0;
  private membershipTier: MembershipTier = 'free';
  private keychainService: KeychainService;

  constructor(options: ConfigurationManagerOptions = {}) {
    this.cloudEndpoint = options.cloudEndpoint || 'https://api.miaoda.dev/v1/config';
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour default
    this.enableCloudSync = options.enableCloudSync !== false;
    this.keychainService = new KeychainService();
  }

  /**
   * Initialize configuration manager
   */
  async initialize(): Promise<void> {
    // Load user configuration from storage
    await this.loadUserConfig();

    // Fetch cloud configuration if enabled
    if (this.enableCloudSync) {
      try {
        await this.syncCloudConfig();
      } catch (error) {
        console.warn('Failed to sync cloud config, using defaults:', error);
        this.cloudModels = DEFAULT_CLOUD_MODELS;
      }
    } else {
      this.cloudModels = DEFAULT_CLOUD_MODELS;
    }
  }

  /**
   * Get all available models (merged from all sources)
   */
  async getAllModels(): Promise<ModelConfig[]> {
    const models: ModelConfig[] = [];

    // Add cloud models (filtered by membership and disabled list)
    const enabledCloudModels = this.cloudModels.filter(model => {
      if (this.userConfig.disabledCloudModels.includes(model.id)) {
        return false;
      }
      if (model.membership) {
        return this.hasAccess(model.membership);
      }
      return true;
    });
    models.push(...enabledCloudModels);

    // Add user custom models
    models.push(...this.userConfig.customModels.filter(m => m.enabled !== false));

    return models;
  }

  /**
   * Get active model configuration
   */
  async getActiveModel(): Promise<ModelConfig | null> {
    if (!this.userConfig.activeModelId) {
      const models = await this.getAllModels();
      return models[0] || null;
    }

    const allModels = await this.getAllModels();
    return allModels.find(m => m.id === this.userConfig.activeModelId) || null;
  }

  /**
   * Set active model
   */
  async setActiveModel(modelId: string): Promise<void> {
    const allModels = await this.getAllModels();
    const model = allModels.find(m => m.id === modelId);

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    this.userConfig.activeModelId = modelId;
    await this.saveUserConfig();
  }

  /**
   * Add custom model
   */
  async addCustomModel(config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
    // Validate configuration
    const validation = this.validateModelConfig(config as ModelConfig);
    if (!validation.valid) {
      throw new Error(`Invalid model configuration: ${validation.errors.join(', ')}`);
    }

    // Create model with metadata
    const model: ModelConfig = {
      ...config,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true
    };

    // Store API key securely if provided
    if (model.apiKey) {
      await (this.keychainService as any).setPassword(`miaoda.model.${model.id}`, model.apiKey);
      // Remove from config object (stored in keychain)
      delete model.apiKey;
    }

    this.userConfig.customModels.push(model);
    await this.saveUserConfig();

    return model;
  }

  /**
   * Update custom model
   */
  async updateCustomModel(modelId: string, updates: Partial<ModelConfig>): Promise<void> {
    const index = this.userConfig.customModels.findIndex(m => m.id === modelId);
    if (index === -1) {
      throw new Error(`Custom model not found: ${modelId}`);
    }

    const model = this.userConfig.customModels[index];
    const updated = { ...model, ...updates, updatedAt: Date.now() };

    // Validate updated configuration
    const validation = this.validateModelConfig(updated);
    if (!validation.valid) {
      throw new Error(`Invalid model configuration: ${validation.errors.join(', ')}`);
    }

    // Update API key in keychain if changed
    if (updates.apiKey) {
      await (this.keychainService as any).setPassword(`miaoda.model.${modelId}`, updates.apiKey);
      delete updated.apiKey;
    }

    this.userConfig.customModels[index] = updated;
    await this.saveUserConfig();
  }

  /**
   * Delete custom model
   */
  async deleteCustomModel(modelId: string): Promise<void> {
    const index = this.userConfig.customModels.findIndex(m => m.id === modelId);
    if (index === -1) {
      throw new Error(`Custom model not found: ${modelId}`);
    }

    // Remove API key from keychain
    await (this.keychainService as any).deletePassword(`miaoda.model.${modelId}`);

    this.userConfig.customModels.splice(index, 1);

    // If this was the active model, clear it
    if (this.userConfig.activeModelId === modelId) {
      this.userConfig.activeModelId = undefined;
    }

    await this.saveUserConfig();
  }

  /**
   * Get model with API key (from keychain)
   */
  async getModelWithCredentials(modelId: string): Promise<ModelConfig | null> {
    const allModels = await this.getAllModels();
    const model = allModels.find(m => m.id === modelId);

    if (!model) {
      return null;
    }

    // Try to get API key from keychain
    const apiKey = await (this.keychainService as any).getPassword(`miaoda.model.${modelId}`);

    return {
      ...model,
      apiKey: apiKey || model.apiKey
    };
  }

  /**
   * Create model from preset
   */
  async createFromPreset(presetId: string, apiKey?: string, customUrl?: string): Promise<ModelConfig> {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    const config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'> = {
      name: preset.name,
      nameCN: preset.nameCN,
      provider: preset.provider,
      apiUrl: customUrl || preset.defaultApiUrl,
      model: preset.defaultModel,
      streaming: true,
      enabled: true
    };

    if (apiKey) {
      (config as any).apiKey = apiKey;
    }

    return this.addCustomModel(config);
  }

  /**
   * Get provider presets
   */
  getProviderPresets(): ProviderPreset[] {
    return PROVIDER_PRESETS;
  }

  /**
   * Test model connection
   */
  async testConnection(modelId: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    const model = await this.getModelWithCredentials(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    const startTime = Date.now();

    try {
      // Simple health check request
      const response = await fetch(`${model.apiUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': model.apiKey ? `Bearer ${model.apiKey}` : '',
          ...model.headers
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return { success: true, latency };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Sync cloud configuration
   */
  async syncCloudConfig(force: boolean = false): Promise<void> {
    const now = Date.now();

    // Check cache TTL
    if (!force && (now - this.lastCloudFetch) < this.cacheTTL * 1000) {
      return; // Use cached data
    }

    try {
      const response = await fetch(
        `${this.cloudEndpoint}/models?membership=${this.membershipTier}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Miaoda-IDE/0.1.0'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`Cloud sync failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CloudConfigResponse;

      this.cloudModels = data.models;
      this.membershipTier = data.membership;
      this.lastCloudFetch = now;
      this.userConfig.lastSync = now;

      await this.saveUserConfig();
    } catch (error) {
      console.error('Cloud sync error:', error);
      throw error;
    }
  }

  /**
   * Disable cloud model
   */
  async disableCloudModel(modelId: string): Promise<void> {
    if (!this.userConfig.disabledCloudModels.includes(modelId)) {
      this.userConfig.disabledCloudModels.push(modelId);
      await this.saveUserConfig();
    }
  }

  /**
   * Enable cloud model
   */
  async enableCloudModel(modelId: string): Promise<void> {
    const index = this.userConfig.disabledCloudModels.indexOf(modelId);
    if (index !== -1) {
      this.userConfig.disabledCloudModels.splice(index, 1);
      await this.saveUserConfig();
    }
  }

  /**
   * Export configuration
   */
  async exportConfig(): Promise<string> {
    const exportData = {
      version: '1.0',
      customModels: this.userConfig.customModels,
      disabledCloudModels: this.userConfig.disabledCloudModels,
      activeModelId: this.userConfig.activeModelId,
      exportedAt: Date.now()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      if (data.version !== '1.0') {
        throw new Error('Unsupported configuration version');
      }

      // Validate imported models
      for (const model of data.customModels || []) {
        const validation = this.validateModelConfig(model);
        if (!validation.valid) {
          throw new Error(`Invalid model in import: ${validation.errors.join(', ')}`);
        }
      }

      // Merge with existing configuration
      this.userConfig.customModels.push(...(data.customModels || []));
      this.userConfig.disabledCloudModels = data.disabledCloudModels || [];

      if (data.activeModelId) {
        this.userConfig.activeModelId = data.activeModelId;
      }

      await this.saveUserConfig();
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get membership tier
   */
  getMembershipTier(): MembershipTier {
    return this.membershipTier;
  }

  /**
   * Set membership tier (for testing/development)
   */
  setMembershipTier(tier: MembershipTier): void {
    this.membershipTier = tier;
  }

  /**
   * Validate model configuration
   */
  private validateModelConfig(config: ModelConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Model name is required');
    }

    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (!config.apiUrl || config.apiUrl.trim() === '') {
      errors.push('API URL is required');
    } else {
      try {
        new URL(config.apiUrl);
      } catch {
        errors.push('Invalid API URL format');
      }
    }

    if (!config.model || config.model.trim() === '') {
      errors.push('Model identifier is required');
    }

    if (config.maxTokens !== undefined && (config.maxTokens < 1 || config.maxTokens > 1000000)) {
      warnings.push('Max tokens should be between 1 and 1,000,000');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      warnings.push('Temperature should be between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if user has access to membership tier
   */
  private hasAccess(requiredTier: MembershipTier): boolean {
    const tierLevels: Record<MembershipTier, number> = {
      free: 0,
      pro: 1,
      enterprise: 2,
      custom: 3
    };

    return tierLevels[this.membershipTier] >= tierLevels[requiredTier];
  }

  /**
   * Load user configuration from storage
   */
  private async loadUserConfig(): Promise<void> {
    try {
      // In a real implementation, this would load from VS Code's globalState
      // For now, we'll use a placeholder
      const stored = this.getStoredConfig();
      if (stored) {
        this.userConfig = stored;
      }
    } catch (error) {
      console.error('Failed to load user config:', error);
    }
  }

  /**
   * Save user configuration to storage
   */
  private async saveUserConfig(): Promise<void> {
    try {
      // In a real implementation, this would save to VS Code's globalState
      this.setStoredConfig(this.userConfig);
    } catch (error) {
      console.error('Failed to save user config:', error);
    }
  }

  /**
   * Get stored configuration (placeholder for VS Code integration)
   */
  private getStoredConfig(): UserModelConfig | null {
    // This will be implemented with VS Code's ExtensionContext.globalState
    return null;
  }

  /**
   * Set stored configuration (placeholder for VS Code integration)
   */
  private setStoredConfig(config: UserModelConfig): void {
    // This will be implemented with VS Code's ExtensionContext.globalState
  }
}
