import { initDatabase, closeDatabase } from '../src/config/database';
import { config } from '../src/config/env';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // Use in-memory database for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32-chars';

// Setup before all tests
beforeAll(() => {
  initDatabase();
});

// Cleanup after all tests
afterAll(() => {
  closeDatabase();
});

// Clear database between tests
afterEach(() => {
  // This would clear all tables if needed
  // For now, we'll let each test manage its own data
});
