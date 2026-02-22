import request from 'supertest';
import { createApp } from '../src/app';
import { initDatabase, getDatabase } from '../src/config/database';
import { ModelConfigModel } from '../src/models/ModelConfig';
import { generateToken } from '../src/utils/jwt';

const app = createApp();

describe('Configuration API', () => {
  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    // Clear model_configs table
    const db = getDatabase();
    db.exec('DELETE FROM model_configs');

    // Add test model configs
    ModelConfigModel.create({
      provider: 'ollama',
      model: 'llama2',
      api_url: 'http://localhost:11434',
      membership_required: 'free',
      enabled: true,
    });

    ModelConfigModel.create({
      provider: 'openai',
      model: 'gpt-4',
      api_url: 'https://api.openai.com/v1',
      membership_required: 'pro',
      enabled: true,
    });

    ModelConfigModel.create({
      provider: 'anthropic',
      model: 'claude-opus-4',
      api_url: 'https://api.anthropic.com/v1',
      membership_required: 'enterprise',
      enabled: true,
    });
  });

  describe('GET /api/v1/config/models', () => {
    it('should return all models without membership filter', async () => {
      const response = await request(app)
        .get('/api/v1/config/models')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
    });

    it('should return only free models', async () => {
      const response = await request(app)
        .get('/api/v1/config/models?membership=free')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].membership_required).toBe('free');
    });

    it('should return free and pro models for pro membership', async () => {
      const response = await request(app)
        .get('/api/v1/config/models?membership=pro')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should return all models for enterprise membership', async () => {
      const response = await request(app)
        .get('/api/v1/config/models?membership=enterprise')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
    });

    it('should use authenticated user membership', async () => {
      const token = generateToken({
        userId: 1,
        email: 'test@example.com',
        membership: 'pro',
      });

      const response = await request(app)
        .get('/api/v1/config/models')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/config/models/:id', () => {
    it('should return model config by ID', async () => {
      const response = await request(app)
        .get('/api/v1/config/models/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.provider).toBe('ollama');
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/api/v1/config/models/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
