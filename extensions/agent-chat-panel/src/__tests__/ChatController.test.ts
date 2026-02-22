import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatController, getChatController, resetChatController } from '../ChatController';
import { ChatContext } from '../IChatController';
import * as LLMAdapterModule from '../../../shared-services/src/LLMAdapter';
import * as ContextAnalyzerModule from '../../../shared-services/src/ContextAnalyzer';

/**
 * Feature: miaoda-ide, Task: 9.1
 * Unit tests for Chat Controller implementation
 */
describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(() => {
    resetChatController();
    controller = new ChatController();

    // Mock LLM Adapter
    vi.spyOn(LLMAdapterModule, 'getLLMAdapter').mockReturnValue({
      complete: vi.fn().mockResolvedValue({
        content: 'AI response',
        usage: { promptTokens: 10, completionTokens: 20 },
        model: 'test-model',
      }),
      stream: vi.fn(),
      setProvider: vi.fn(),
      getProviderStatus: vi.fn(),
      listModels: vi.fn(),
      getCurrentConfig: vi.fn(),
    } as any);

    // Mock Context Analyzer
    vi.spyOn(ContextAnalyzerModule, 'getContextAnalyzer').mockReturnValue({
      buildContext: vi.fn().mockResolvedValue({
        files: [],
        projectInfo: {
          root: '/test',
          languages: ['typescript'],
        },
        totalTokens: 0,
      }),
      isExcluded: vi.fn(),
      setExclusionRules: vi.fn(),
      getExclusionRules: vi.fn(),
    } as any);
  });

  describe('sendMessage', () => {
    it('should send message and get response', async () => {
      const response = await controller.sendMessage('Hello');

      expect(response.message).toBeDefined();
      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBe('AI response');
    });

    it('should add user message to history', async () => {
      await controller.sendMessage('Hello');

      const history = controller.getHistory();
      const userMessage = history.find((msg) => msg.role === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage?.content).toBe('Hello');
    });

    it('should add assistant message to history', async () => {
      await controller.sendMessage('Hello');

      const history = controller.getHistory();
      const assistantMessage = history.find((msg) => msg.role === 'assistant');

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBe('AI response');
    });

    it('should include context when provided', async () => {
      const context: ChatContext = {
        activeFile: 'src/index.ts',
        workspaceRoot: '/test',
      };

      await controller.sendMessage('Hello', context);

      const contextAnalyzer = ContextAnalyzerModule.getContextAnalyzer();
      expect(contextAnalyzer.buildContext).toHaveBeenCalled();
    });

    it('should detect agent task trigger', async () => {
      const llmAdapter = LLMAdapterModule.getLLMAdapter();
      vi.mocked(llmAdapter.complete).mockResolvedValue({
        content: 'Let me implement this feature for you',
        usage: { promptTokens: 10, completionTokens: 20 },
        model: 'test-model',
      });

      const context: ChatContext = {
        workspaceRoot: '/test',
      };

      const response = await controller.sendMessage('Create a new feature', context);

      expect(response.agentTask).toBeDefined();
      expect(response.agentTask?.description).toContain('Let me implement');
    });

    it('should not trigger agent task without action keywords', async () => {
      const response = await controller.sendMessage('Hello');

      expect(response.agentTask).toBeUndefined();
    });
  });

  describe('clearSession', () => {
    it('should clear conversation history', async () => {
      await controller.sendMessage('Message 1');
      await controller.sendMessage('Message 2');

      expect(controller.getHistory().length).toBeGreaterThan(0);

      controller.clearSession();

      expect(controller.getHistory()).toEqual([]);
    });

    it('should generate new session ID', () => {
      const oldSessionId = controller.getSessionId();

      controller.clearSession();

      const newSessionId = controller.getSessionId();
      expect(newSessionId).not.toBe(oldSessionId);
    });
  });

  describe('Property 3: 对话历史完整性', () => {
    it('should maintain complete message sequence', async () => {
      await controller.sendMessage('Message 1');
      await controller.sendMessage('Message 2');
      await controller.sendMessage('Message 3');

      const history = controller.getHistory();

      // Should have 6 messages (3 user + 3 assistant)
      expect(history.length).toBe(6);

      // Messages should be in order
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Message 1');
      expect(history[1].role).toBe('assistant');

      expect(history[2].role).toBe('user');
      expect(history[2].content).toBe('Message 2');
      expect(history[3].role).toBe('assistant');

      expect(history[4].role).toBe('user');
      expect(history[4].content).toBe('Message 3');
      expect(history[5].role).toBe('assistant');
    });

    it('should preserve history until clearSession', async () => {
      await controller.sendMessage('Message 1');
      await controller.sendMessage('Message 2');

      const historyBefore = controller.getHistory();
      expect(historyBefore.length).toBe(4);

      // History should persist
      const historyAfter = controller.getHistory();
      expect(historyAfter).toEqual(historyBefore);

      // Clear session
      controller.clearSession();

      const historyAfterClear = controller.getHistory();
      expect(historyAfterClear).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('should return copy of history', async () => {
      await controller.sendMessage('Hello');

      const history1 = controller.getHistory();
      const history2 = controller.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // Different array instances
    });
  });

  describe('Message metadata', () => {
    it('should include message ID', async () => {
      const response = await controller.sendMessage('Hello');

      expect(response.message.id).toBeDefined();
      expect(typeof response.message.id).toBe('string');
    });

    it('should include timestamp', async () => {
      const before = Date.now();
      const response = await controller.sendMessage('Hello');
      const after = Date.now();

      expect(response.message.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.message.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getChatController();
      const instance2 = getChatController();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getChatController();
      resetChatController();
      const instance2 = getChatController();

      expect(instance1).not.toBe(instance2);
    });
  });
});
