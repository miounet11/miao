import request from 'supertest';
import { createApp } from '../src/app';
import { initDatabase, getDatabase } from '../src/config/database';
import { UserModel } from '../src/models/User';
import { hashPassword } from '../src/utils/hash';
import { generateToken } from '../src/utils/jwt';

const app = createApp();

describe('User API', () => {
  let testUserId: number;
  let testToken: string;

  beforeAll(() => {
    initDatabase();
  });

  beforeEach(async () => {
    // Clear tables
    const db = getDatabase();
    db.exec('DELETE FROM user_configs');
    db.exec('DELETE FROM users');

    // Create test user
    const passwordHash = await hashPassword('Test1234');
    const user = UserModel.create({
      email: 'test@example.com',
      password_hash: passwordHash,
      membership: 'free',
    });

    testUserId = user.id;
    testToken = generateToken({
      userId: user.id,
      email: user.email,
      membership: user.membership,
    });
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.membership).toBe('free');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/user/config', () => {
    it('should save user configuration', async () => {
      const config = {
        theme: 'dark',
        fontSize: 14,
        models: ['gpt-4', 'claude-opus-4'],
      };

      const response = await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send(config)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.fontSize).toBe(14);
    });

    it('should update existing configuration', async () => {
      // Save initial config
      await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ theme: 'light' });

      // Update config
      const response = await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ theme: 'dark', fontSize: 16 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.fontSize).toBe(16);
    });

    it('should reject invalid configuration', async () => {
      const response = await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ fontSize: 100 }) // Invalid: max is 32
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/user/config', () => {
    it('should return user configuration', async () => {
      // Save config first
      const config = { theme: 'dark', fontSize: 14 };
      await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send(config);

      // Get config
      const response = await request(app)
        .get('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.fontSize).toBe(14);
    });

    it('should return empty config if none exists', async () => {
      const response = await request(app)
        .get('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});
    });
  });

  describe('DELETE /api/v1/user/config', () => {
    it('should delete user configuration', async () => {
      // Save config first
      await request(app)
        .post('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ theme: 'dark' });

      // Delete config
      const response = await request(app)
        .delete('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify config is deleted
      const getResponse = await request(app)
        .get('/api/v1/user/config')
        .set('Authorization', `Bearer ${testToken}`);

      expect(getResponse.body.data).toEqual({});
    });
  });
});
