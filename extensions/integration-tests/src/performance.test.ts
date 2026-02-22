/**
 * Integration Test: Performance Benchmarks
 * Tests system performance under load
 */

import { describe, it, expect } from 'vitest';
import { getEventBus } from '../../shared-services/src/EventBus';
import { getAgentOrchestrator } from '../../agent-orchestrator/src/AgentOrchestrator';
import { getChatHistoryStorage } from '../../shared-services/src/ChatHistoryStorage';
import * as vscode from 'vscode';

describe('Integration: Performance', () => {
  const mockContext: vscode.ExtensionContext = {
    globalStorageUri: {
      fsPath: '/tmp/perf-test',
    },
  } as any;

  it('should handle 100 concurrent event emissions', () => {
    const eventBus = getEventBus();
    const received: number[] = [];

    eventBus.on('perf.test', (payload: any) => {
      received.push(payload.id);
    });

    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      eventBus.emit('perf.test', { id: i });
    }

    const duration = Date.now() - start;

    expect(received).toHaveLength(100);
    expect(duration).toBeLessThan(100); // Should be very fast
  });

  it('should handle 50 concurrent task submissions', async () => {
    const orchestrator = getAgentOrchestrator();
    const start = Date.now();

    const taskIds = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        orchestrator.submitTask({
          type: 'code_generation' as any,
          description: `Task ${i}`,
          context: { workspaceRoot: '/test' },
        })
      )
    );

    const duration = Date.now() - start;

    expect(taskIds).toHaveLength(50);
    expect(duration).toBeLessThan(1000); // Should submit quickly
  });

  it('should handle large session history', async () => {
    const storage = getChatHistoryStorage(mockContext);

    // Create session with 100 messages
    const messages = Array.from({ length: 100 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
      timestamp: Date.now() + i,
    }));

    const session = {
      id: 'large-session',
      title: 'Large Session',
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const start = Date.now();
    await storage.saveSession(session);
    const saveDuration = Date.now() - start;

    const loadStart = Date.now();
    const loaded = await storage.loadSession('large-session');
    const loadDuration = Date.now() - loadStart;

    expect(loaded?.messages).toHaveLength(100);
    expect(saveDuration).toBeLessThan(500);
    expect(loadDuration).toBeLessThan(200);
  });

  it('should handle rapid session searches', async () => {
    const storage = getChatHistoryStorage(mockContext);

    // Create 20 sessions
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        storage.saveSession({
          id: `session-${i}`,
          title: `Session ${i}`,
          messages: [
            {
              id: `msg-${i}`,
              role: 'user',
              content: `Content ${i}`,
              timestamp: Date.now(),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )
    );

    const start = Date.now();

    // Perform 10 searches
    for (let i = 0; i < 10; i++) {
      await storage.searchSessions(`Content ${i}`);
    }

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should be reasonably fast
  });

  it('should handle memory efficiently with many tasks', async () => {
    const orchestrator = getAgentOrchestrator();

    // Submit 100 tasks
    const taskIds = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        orchestrator.submitTask({
          type: 'code_generation' as any,
          description: `Memory test ${i}`,
          context: { workspaceRoot: '/test' },
        })
      )
    );

    // List all tasks multiple times
    for (let i = 0; i < 10; i++) {
      await orchestrator.listTasks();
    }

    // Cancel half the tasks
    for (let i = 0; i < 50; i++) {
      await orchestrator.cancelTask(taskIds[i]);
    }

    const remaining = await orchestrator.listTasks();
    expect(remaining.length).toBeGreaterThanOrEqual(50);
  });
});
