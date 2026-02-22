/**
 * Integration Test: Complete Chat Flow
 * Tests the full chat workflow from user input to agent execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getChatController } from '../../agent-chat-panel/src/ChatController';
import { getAgentOrchestrator } from '../../agent-orchestrator/src/AgentOrchestrator';
import { getChatHistoryStorage } from '../../shared-services/src/ChatHistoryStorage';
import { getLLMAdapter } from '../../shared-services/src/LLMAdapter';
import * as vscode from 'vscode';

describe('Integration: Complete Chat Flow', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      globalStorageUri: {
        fsPath: '/tmp/test-storage',
      },
    } as any;
  });

  it('should handle complete chat workflow', async () => {
    // 1. Initialize components
    const chatController = getChatController(mockContext);
    const orchestrator = getAgentOrchestrator();
    const storage = getChatHistoryStorage(mockContext);

    // 2. Send a message
    const response = await chatController.sendMessage(
      'Create a React component for user profile',
      {
        workspaceRoot: '/test/workspace',
        activeFile: '/test/workspace/src/App.tsx',
      }
    );

    // 3. Verify response
    expect(response.message).toBeDefined();
    expect(response.message.role).toBe('assistant');
    expect(response.message.content).toBeTruthy();

    // 4. Check if agent task was triggered
    if (response.agentTask) {
      const taskId = await orchestrator.submitTask({
        type: 'code_generation' as any,
        description: response.agentTask.description,
        context: response.agentTask.context,
      });

      expect(taskId).toBeDefined();

      // 5. Wait for task to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      const taskStatus = await orchestrator.getTaskStatus(taskId);
      expect(taskStatus).toBeDefined();
      expect(['pending', 'running']).toContain(taskStatus?.state);
    }

    // 6. Verify history was saved
    const history = chatController.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);

    // 7. Verify session was persisted
    const sessionId = chatController.getSessionId();
    const session = await storage.loadSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle multiple chat sessions', async () => {
    const chatController = getChatController(mockContext);
    const storage = getChatHistoryStorage(mockContext);

    // Session 1
    await chatController.sendMessage('Hello', { workspaceRoot: '/test' });
    const session1Id = chatController.getSessionId();

    // Session 2
    await chatController.clearSession();
    await chatController.sendMessage('World', { workspaceRoot: '/test' });
    const session2Id = chatController.getSessionId();

    expect(session1Id).not.toBe(session2Id);

    // Verify both sessions exist
    const session1 = await storage.loadSession(session1Id);
    const session2 = await storage.loadSession(session2Id);

    expect(session1).toBeDefined();
    expect(session2).toBeDefined();
    expect(session1?.messages[0].content).toBe('Hello');
    expect(session2?.messages[0].content).toBe('World');
  });

  it('should handle session search', async () => {
    const chatController = getChatController(mockContext);
    const storage = getChatHistoryStorage(mockContext);

    // Create sessions with different content
    await chatController.sendMessage('Create a React component', {
      workspaceRoot: '/test',
    });
    await chatController.clearSession();

    await chatController.sendMessage('Write Python script', {
      workspaceRoot: '/test',
    });
    await chatController.clearSession();

    await chatController.sendMessage('Fix TypeScript error', {
      workspaceRoot: '/test',
    });

    // Search for React
    const reactSessions = await storage.searchSessions('React');
    expect(reactSessions.length).toBeGreaterThan(0);
    expect(reactSessions[0].messages.some((m) => m.content.includes('React'))).toBe(true);

    // Search for Python
    const pythonSessions = await storage.searchSessions('Python');
    expect(pythonSessions.length).toBeGreaterThan(0);
    expect(pythonSessions[0].messages.some((m) => m.content.includes('Python'))).toBe(true);
  });

  it('should handle concurrent agent tasks', async () => {
    const orchestrator = getAgentOrchestrator();

    // Submit multiple tasks
    const taskIds = await Promise.all([
      orchestrator.submitTask({
        type: 'code_generation' as any,
        description: 'Task 1',
        context: { workspaceRoot: '/test' },
      }),
      orchestrator.submitTask({
        type: 'bug_fix' as any,
        description: 'Task 2',
        context: { workspaceRoot: '/test' },
      }),
      orchestrator.submitTask({
        type: 'test_generation' as any,
        description: 'Task 3',
        context: { workspaceRoot: '/test' },
      }),
    ]);

    expect(taskIds).toHaveLength(3);

    // Wait for tasks to start
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify all tasks are tracked
    const allTasks = await orchestrator.listTasks();
    expect(allTasks.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle task cancellation', async () => {
    const orchestrator = getAgentOrchestrator();

    const taskId = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Long running task',
      context: { workspaceRoot: '/test' },
    });

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cancel task
    const cancelled = await orchestrator.cancelTask(taskId);
    expect(cancelled).toBe(true);

    const status = await orchestrator.getTaskStatus(taskId);
    expect(status?.state).toBe('cancelled');
  });
});
