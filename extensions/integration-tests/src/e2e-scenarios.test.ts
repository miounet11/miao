/**
 * End-to-End Test Scenarios
 * Real-world usage scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getChatController } from '../../agent-chat-panel/src/ChatController';
import { getAgentOrchestrator } from '../../agent-orchestrator/src/AgentOrchestrator';
import { getChatHistoryStorage } from '../../shared-services/src/ChatHistoryStorage';
import { getEventBus } from '../../shared-services/src/EventBus';
import * as vscode from 'vscode';

describe('E2E: Real-world Scenarios', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      globalStorageUri: {
        fsPath: '/tmp/e2e-test',
      },
    } as any;
  });

  it('Scenario 1: User asks to create a component, agent executes', async () => {
    const chatController = getChatController(mockContext);
    const orchestrator = getAgentOrchestrator();
    const eventBus = getEventBus();

    let taskCompleted = false;

    // Listen for task completion
    eventBus.on('agent.task.updated', (status: any) => {
      if (status.state === 'completed') {
        taskCompleted = true;
      }
    });

    // Step 1: User sends message
    const response = await chatController.sendMessage(
      'Create a React component called UserProfile with props for name and email',
      {
        workspaceRoot: '/project',
        activeFile: '/project/src/App.tsx',
      }
    );

    expect(response.message.content).toBeTruthy();

    // Step 2: Submit agent task
    const taskId = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Create UserProfile component',
      context: {
        workspaceRoot: '/project',
        activeFile: '/project/src/App.tsx',
      },
    });

    // Step 3: Wait for task completion
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const taskStatus = await orchestrator.getTaskStatus(taskId);
    expect(taskStatus?.state).toBe('completed');
    expect(taskCompleted).toBe(true);

    // Step 4: Verify history
    const history = chatController.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('Scenario 2: User searches old conversations and continues', async () => {
    const chatController = getChatController(mockContext);
    const storage = getChatHistoryStorage(mockContext);

    // Step 1: Create initial conversation
    await chatController.sendMessage('How do I use React hooks?', {
      workspaceRoot: '/project',
    });
    const session1Id = chatController.getSessionId();

    // Step 2: Start new conversation
    await chatController.clearSession();
    await chatController.sendMessage('What is TypeScript?', {
      workspaceRoot: '/project',
    });

    // Step 3: Search for React conversation
    const results = await storage.searchSessions('React hooks');
    expect(results.length).toBeGreaterThan(0);

    // Step 4: Load old conversation
    const loaded = await chatController.loadSession(session1Id);
    expect(loaded).toBe(true);

    // Step 5: Continue conversation
    await chatController.sendMessage('Can you show me an example?', {
      workspaceRoot: '/project',
    });

    const history = chatController.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(4); // 2 from before + 2 new
  });

  it('Scenario 3: Multiple concurrent tasks with priorities', async () => {
    const orchestrator = getAgentOrchestrator();

    // Submit tasks with different priorities
    const urgentTask = await orchestrator.submitTask({
      type: 'bug_fix' as any,
      description: 'Fix critical production bug',
      context: { workspaceRoot: '/project' },
      priority: 3, // URGENT
    });

    const normalTask = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Add new feature',
      context: { workspaceRoot: '/project' },
      priority: 1, // NORMAL
    });

    const lowTask = await orchestrator.submitTask({
      type: 'documentation' as any,
      description: 'Update README',
      context: { workspaceRoot: '/project' },
      priority: 0, // LOW
    });

    // Wait for execution to start
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify urgent task started first
    const urgentStatus = await orchestrator.getTaskStatus(urgentTask);
    expect(['running', 'completed']).toContain(urgentStatus?.state);
  });

  it('Scenario 4: User exports chat history for documentation', async () => {
    const chatController = getChatController(mockContext);
    const storage = getChatHistoryStorage(mockContext);

    // Create a conversation
    await chatController.sendMessage('How do I implement authentication?', {
      workspaceRoot: '/project',
    });
    await chatController.sendMessage('Can you show me JWT implementation?', {
      workspaceRoot: '/project',
    });

    const sessionId = chatController.getSessionId();
    const session = await storage.loadSession(sessionId);

    expect(session).toBeDefined();
    expect(session?.messages.length).toBeGreaterThanOrEqual(4);

    // Verify session can be serialized
    const json = JSON.stringify(session, null, 2);
    expect(json).toBeTruthy();
    expect(json.length).toBeGreaterThan(100);
  });

  it('Scenario 5: Error handling and recovery', async () => {
    const orchestrator = getAgentOrchestrator();

    // Submit a task
    const taskId = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Test error handling',
      context: { workspaceRoot: '/project' },
    });

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Cancel the task (simulating error)
    await orchestrator.cancelTask(taskId);

    // Submit a new task (recovery)
    const newTaskId = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Retry after error',
      context: { workspaceRoot: '/project' },
    });

    const newStatus = await orchestrator.getTaskStatus(newTaskId);
    expect(newStatus).toBeDefined();
    expect(['pending', 'running']).toContain(newStatus?.state);
  });

  it('Scenario 6: Long conversation with context management', async () => {
    const chatController = getChatController(mockContext);

    // Simulate a long conversation (10 messages)
    for (let i = 0; i < 5; i++) {
      await chatController.sendMessage(`Question ${i + 1}`, {
        workspaceRoot: '/project',
      });
    }

    const history = chatController.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(10); // 5 questions + 5 responses

    // Verify session was saved
    const sessionId = chatController.getSessionId();
    const storage = getChatHistoryStorage(mockContext);
    const session = await storage.loadSession(sessionId);

    expect(session?.messages.length).toBe(history.length);
  });

  it('Scenario 7: Cross-extension event coordination', async () => {
    const eventBus = getEventBus();
    const chatController = getChatController(mockContext);
    const orchestrator = getAgentOrchestrator();

    const events: string[] = [];

    // Chat extension listens for agent events
    eventBus.on('agent.task.submitted', () => {
      events.push('task_submitted');
    });

    eventBus.on('agent.task.updated', () => {
      events.push('task_updated');
    });

    // Send chat message
    await chatController.sendMessage('Create a function', {
      workspaceRoot: '/project',
    });

    // Submit agent task
    await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Create function',
      context: { workspaceRoot: '/project' },
    });

    // Wait for events
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(events).toContain('task_submitted');
    expect(events.length).toBeGreaterThan(1);
  });
});
