import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatHistoryStorage, ChatSession, ChatMessage } from '../ChatHistoryStorage';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

describe('ChatHistoryStorage', () => {
  let storage: ChatHistoryStorage;
  let testDir: string;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    testDir = path.join(__dirname, '.test-storage');
    mockContext = {
      globalStorageUri: {
        fsPath: testDir,
      },
    } as any;

    storage = new ChatHistoryStorage(mockContext);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('saveSession', () => {
    it('should save session to file', async () => {
      const session: ChatSession = {
        id: 'test-session-1',
        title: 'Test Chat',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await storage.saveSession(session);

      const sessionPath = path.join(testDir, 'chat-history', 'test-session-1.json');
      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should overwrite existing session', async () => {
      const session: ChatSession = {
        id: 'test-session-2',
        title: 'Original Title',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await storage.saveSession(session);

      session.title = 'Updated Title';
      await storage.saveSession(session);

      const loaded = await storage.loadSession('test-session-2');
      expect(loaded?.title).toBe('Updated Title');
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      const session: ChatSession = {
        id: 'test-session-3',
        title: 'Load Test',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Test message',
            timestamp: 123456,
          },
        ],
        createdAt: 100000,
        updatedAt: 200000,
      };

      await storage.saveSession(session);
      const loaded = await storage.loadSession('test-session-3');

      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe('test-session-3');
      expect(loaded?.title).toBe('Load Test');
      expect(loaded?.messages).toHaveLength(1);
      expect(loaded?.messages[0].content).toBe('Test message');
    });

    it('should return undefined for non-existent session', async () => {
      const loaded = await storage.loadSession('non-existent');
      expect(loaded).toBeUndefined();
    });
  });

  describe('listSessions', () => {
    it('should list all sessions sorted by updatedAt', async () => {
      const session1: ChatSession = {
        id: 'session-1',
        title: 'First',
        messages: [],
        createdAt: 100,
        updatedAt: 100,
      };

      const session2: ChatSession = {
        id: 'session-2',
        title: 'Second',
        messages: [],
        createdAt: 200,
        updatedAt: 300,
      };

      const session3: ChatSession = {
        id: 'session-3',
        title: 'Third',
        messages: [],
        createdAt: 150,
        updatedAt: 200,
      };

      await storage.saveSession(session1);
      await storage.saveSession(session2);
      await storage.saveSession(session3);

      const sessions = await storage.listSessions();

      expect(sessions).toHaveLength(3);
      expect(sessions[0].id).toBe('session-2'); // updatedAt: 300
      expect(sessions[1].id).toBe('session-3'); // updatedAt: 200
      expect(sessions[2].id).toBe('session-1'); // updatedAt: 100
    });

    it('should return empty array when no sessions exist', async () => {
      const sessions = await storage.listSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const session: ChatSession = {
        id: 'delete-test',
        title: 'To Delete',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await storage.saveSession(session);
      expect(await storage.loadSession('delete-test')).toBeDefined();

      await storage.deleteSession('delete-test');
      expect(await storage.loadSession('delete-test')).toBeUndefined();
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(storage.deleteSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('searchSessions', () => {
    beforeEach(async () => {
      const sessions: ChatSession[] = [
        {
          id: 'search-1',
          title: 'React Component',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'How to create a React component?',
              timestamp: Date.now(),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'search-2',
          title: 'Python Script',
          messages: [
            {
              id: 'msg-2',
              role: 'user',
              content: 'Write a Python script for data processing',
              timestamp: Date.now(),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'search-3',
          title: 'TypeScript Types',
          messages: [
            {
              id: 'msg-3',
              role: 'user',
              content: 'Explain TypeScript generic types',
              timestamp: Date.now(),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      for (const session of sessions) {
        await storage.saveSession(session);
      }
    });

    it('should find sessions by title', async () => {
      const results = await storage.searchSessions('React');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('search-1');
    });

    it('should find sessions by message content', async () => {
      const results = await storage.searchSessions('Python');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('search-2');
    });

    it('should be case-insensitive', async () => {
      const results = await storage.searchSessions('typescript');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('search-3');
    });

    it('should return empty array when no matches', async () => {
      const results = await storage.searchSessions('Rust');
      expect(results).toEqual([]);
    });

    it('should find multiple matches', async () => {
      const results = await storage.searchSessions('script');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });
});
