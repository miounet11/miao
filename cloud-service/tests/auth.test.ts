import request from 'supertest';
import { createApp } from '../src/app';
import { initDatabase, getDatabase } from '../src/config/database';
import { UserModel } from '../src/models/User';
import { hashPassword } from '../src/utils/hash';

const app = createApp();

describe('Authentication API', () => {
  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    // Clear users table
    const db = getDatabase();
    db.exec('DELETE FROM users');
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.membership).toBe('free');
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'Test1234',
      });

      // Try to register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const passwordHash = await hashPassword('Test1234');
      UserModel.create({
        email: 'test@example.com',
        password_hash: passwordHash,
        membership: 'free',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
