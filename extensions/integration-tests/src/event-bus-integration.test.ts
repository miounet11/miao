/**
 * Integration Test: Event Bus Communication
 * Tests inter-extension communication via Event Bus
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getEventBus } from '../../shared-services/src/EventBus';
import { getChatController } from '../../agent-chat-panel/src/ChatController';
import { getAgentOrchestrator } from '../../agent-orchestrator/src/AgentOrchestrator';
import * as vscode from 'vscode';

describe('Integration: Event Bus Communication', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      globalStorageUri: {
        fsPath: '/tmp/test-storage',
      },
    } as any;
  });

  it('should broadcast chat events', async () => {
    const eventBus = getEventBus();
    const events: any[] = [];

    // Subscribe to chat events
    eventBus.on('chat.message.sent', (payload) => {
      events.push({ type: 'sent', payload });
    });

    eventBus.on('chat.message.received', (payload) => {
      events.push({ type: 'received', payload });
    });

    // Emit events
    eventBus.emit('chat.message.sent', { content: 'Hello' });
    eventBus.emit('chat.message.received', { content: 'Hi there' });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('sent');
    expect(events[1].type).toBe('received');
  });

  it('should broadcast agent task events', async () => {
    const eventBus = getEventBus();
    const orchestrator = getAgentOrchestrator();
    const events: any[] = [];

    // Subscribe to agent events
    eventBus.on('agent.task.submitted', (payload) => {
      events.push({ type: 'submitted', payload });
    });

    eventBus.on('agent.task.updated', (payload) => {
      events.push({ type: 'updated', payload });
    });

    // Submit a task
    await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Test task',
      context: { workspaceRoot: '/test' },
    });

    // Wait for events
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'submitted')).toBe(true);
  });

  it('should handle request-response pattern', async () => {
    const eventBus = getEventBus();

    // Set up responder
    eventBus.on('test.request', (payload: any) => {
      eventBus.emit('test.response', { result: payload.value * 2 });
    });

    // Send request
    eventBus.emit('test.request', { value: 21 });

    // Wait for response
    const response = await new Promise<any>((resolve) => {
      eventBus.once('test.response', resolve);
    });

    expect(response.result).toBe(42);
  });

  it('should handle multiple subscribers', async () => {
    const eventBus = getEventBus();
    const results: number[] = [];

    // Multiple subscribers
    eventBus.on('test.event', () => results.push(1));
    eventBus.on('test.event', () => results.push(2));
    eventBus.on('test.event', () => results.push(3));

    eventBus.emit('test.event', {});

    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle disposable subscriptions', () => {
    const eventBus = getEventBus();
    let count = 0;

    const disposable = eventBus.on('test.disposable', () => {
      count++;
    });

    eventBus.emit('test.disposable', {});
    expect(count).toBe(1);

    disposable.dispose();

    eventBus.emit('test.disposable', {});
    expect(count).toBe(1); // Should not increment
  });

  it('should handle once subscriptions', () => {
    const eventBus = getEventBus();
    let count = 0;

    eventBus.once('test.once', () => {
      count++;
    });

    eventBus.emit('test.once', {});
    expect(count).toBe(1);

    eventBus.emit('test.once', {});
    expect(count).toBe(1); // Should not increment
  });

  it('should handle cross-extension communication', async () => {
    const eventBus = getEventBus();
    const chatController = getChatController(mockContext);
    const orchestrator = getAgentOrchestrator();

    let taskSubmitted = false;

    // Chat extension listens for task completion
    eventBus.on('agent.task.updated', (status: any) => {
      if (status.state === 'completed') {
        taskSubmitted = true;
      }
    });

    // Submit task from orchestrator
    const taskId = await orchestrator.submitTask({
      type: 'code_generation' as any,
      description: 'Cross-extension test',
      context: { workspaceRoot: '/test' },
    });

    // Wait for task to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(taskSubmitted).toBe(true);
  });
});
