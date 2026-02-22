import { ModelConfigModel, ModelConfig } from '../models/ModelConfig';

/**
 * Configuration service with caching
 */
export class ConfigService {
  private static cache: Map<string, { data: ModelConfig[]; timestamp: number }> = new Map();
  private static cacheTTL = 3600 * 1000; // 1 hour in milliseconds

  /**
   * Get model configurations by membership tier
   */
  static getModelConfigs(
    membership?: 'free' | 'pro' | 'enterprise'
  ): ModelConfig[] {
    const cacheKey = membership || 'all';

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Fetch from database
    const configs = membership
      ? ModelConfigModel.findByMembership(membership)
      : ModelConfigModel.findAll();

    // Update cache
    this.cache.set(cacheKey, {
      data: configs,
      timestamp: Date.now(),
    });

    return configs;
  }

  /**
   * Clear cache (useful after updates)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get single model config by ID
   */
  static getModelConfigById(id: number): ModelConfig | null {
    return ModelConfigModel.findById(id);
  }

  /**
   * Set cache TTL
   */
  static setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}
