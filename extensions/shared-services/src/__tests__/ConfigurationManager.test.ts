/**
 * Tests for ConfigurationManager
 */

import { ConfigurationManager } from '../ConfigurationManager';
import { ModelConfig, MembershipTier } from '../ModelConfigSchema';

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;

  beforeEach(async () => {
    manager = new ConfigurationManager({
      enableCloudSync: false // Disable cloud sync for tests
    });
    await manager.initialize();
  });

  describe('initialization', () => {
    it('should initialize with default models', async () => {
      const models = await manager.getAllModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should have free membership by default', () => {
      expect(manager.getMembershipTier()).toBe('free');
    });
  });

  describe('model management', () => {
    it('should add custom model', async () => {
      const config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Model',
        provider: 'openai',
        apiUrl: 'https://api.test.com/v1',
        model: 'test-model',
        enabled: true
      };

      const model = await manager.addCustomModel(config);
      expect(model.id).toBeDefined();
      expect(model.name).toBe('Test Model');
      expect(model.source).toBe('user');
    });

    it('should reject invalid model configuration', async () => {
      const config: any = {
        name: '',
        provider: 'openai',
        apiUrl: 'invalid-url',
        model: ''
      };

      await expect(manager.addCustomModel(config)).rejects.toThrow();
    });

    it('should update custom model', async () => {
      const config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Model',
        provider: 'openai',
        apiUrl: 'https://api.test.com/v1',
        model: 'test-model',
        enabled: true
      };

      const model = await manager.addCustomModel(config);
      await manager.updateCustomModel(model.id, { name: 'Updated Model' });

      const models = await manager.getAllModels();
      const updated = models.find(m => m.id === model.id);
      expect(updated?.name).toBe('Updated Model');
    });

    it('should delete custom model', async () => {
      const config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Model',
        provider: 'openai',
        apiUrl: 'https://api.test.com/v1',
        model: 'test-model',
        enabled: true
      };

      const model = await manager.addCustomModel(config);
      await manager.deleteCustomModel(model.id);

      const models = await manager.getAllModels();
      const deleted = models.find(m => m.id === model.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('active model', () => {
    it('should set and get active model', async () => {
      const models = await manager.getAllModels();
      const firstModel = models[0];

      await manager.setActiveModel(firstModel.id);
      const active = await manager.getActiveModel();

      expect(active?.id).toBe(firstModel.id);
    });

    it('should return first model if no active model set', async () => {
      const active = await manager.getActiveModel();
      const models = await manager.getAllModels();

      expect(active?.id).toBe(models[0]?.id);
    });
  });

  describe('presets', () => {
    it('should get provider presets', () => {
      const presets = manager.getProviderPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
    });

    it('should create model from preset', async () => {
      const model = await manager.createFromPreset('openai', 'test-api-key');
      expect(model.provider).toBe('openai');
      expect(model.source).toBe('user');
    });
  });

  describe('membership tiers', () => {
    it('should filter models by membership tier', async () => {
      manager.setMembershipTier('free');
      const freeModels = await manager.getAllModels();

      manager.setMembershipTier('pro');
      const proModels = await manager.getAllModels();

      expect(proModels.length).toBeGreaterThanOrEqual(freeModels.length);
    });
  });

  describe('import/export', () => {
    it('should export configuration', async () => {
      const config: Omit<ModelConfig, 'id' | 'source' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Model',
        provider: 'openai',
        apiUrl: 'https://api.test.com/v1',
        model: 'test-model',
        enabled: true
      };

      await manager.addCustomModel(config);
      const exported = await manager.exportConfig();

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('1.0');
      expect(parsed.customModels.length).toBeGreaterThan(0);
    });

    it('should import configuration', async () => {
      const importData = {
        version: '1.0',
        customModels: [
          {
            id: 'imported-1',
            name: 'Imported Model',
            provider: 'openai',
            apiUrl: 'https://api.test.com/v1',
            model: 'test-model',
            source: 'user',
            enabled: true
          }
        ],
        disabledCloudModels: [],
        exportedAt: Date.now()
      };

      await manager.importConfig(JSON.stringify(importData));
      const models = await manager.getAllModels();
      const imported = models.find(m => m.id === 'imported-1');

      expect(imported).toBeDefined();
      expect(imported?.name).toBe('Imported Model');
    });
  });
});
