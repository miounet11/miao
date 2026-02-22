import { describe, it, expect, beforeEach } from 'vitest';
import { LLMAdapter, getLLMAdapter, resetLLMAdapter } from '../LLMAdapter';
import { LLMProviderConfig } from '../ILLMAdapter';

/**
 * Feature: miaoda-ide, Task: 5.1
 * Unit tests for LLM Adapter implementation
 */
describe('LLMAdapter', () => {
  let adapter: LLMAdapter;

  beforeEach(() => {
    adapter = new LLMAdapter();
  });

  describe('setProvider', () => {
    it('should set OpenAI provider', () => {
      const config: LLMProviderConfig = {
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      expect(() => {
        adapter.setProvider(config);
      }).not.toThrow();

      expect(adapter.getCurrentConfig()).toEqual(config);
    });

    it('should set Anthropic provider', () => {
      const config: LLMProviderConfig = {
        type: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-opus-4',
      };

      adapter.setProvider(config);
      expect(adapter.getCurrentConfig()).toEqual(config);
    });

    it('should set Ollama provider', () => {
      const config: LLMProviderConfig = {
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      };

      adapter.setProvider(config);
      expect(adapter.getCurrentConfig()).toEqual(config);
    });

    it('should throw for unsupported provider type', () => {
      const config = {
        type: 'unsupported',
        model: 'test',
      } as unknown as LLMProviderConfig;

      expect(() => {
        adapter.setProvider(config);
      }).toThrow('Unsupported provider type');
    });
  });

  describe('Provider hot-swap (Property 4)', () => {
    it('should switch providers without restart', async () => {
      // Set OpenAI provider
      const openaiConfig: LLMProviderConfig = {
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };
      adapter.setProvider(openaiConfig);

      let status = await adapter.getProviderStatus();
      expect(status.provider).toBe('openai');
      expect(status.model).toBe('gpt-4');

      // Hot-swap to Anthropic
      const anthropicConfig: LLMProviderConfig = {
        type: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-opus-4',
      };
      adapter.setProvider(anthropicConfig);

      status = await adapter.getProviderStatus();
      expect(status.provider).toBe('anthropic');
      expect(status.model).toBe('claude-opus-4');

      // Hot-swap to Ollama
      const ollamaConfig: LLMProviderConfig = {
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      };
      adapter.setProvider(ollamaConfig);

      status = await adapter.getProviderStatus();
      expect(status.provider).toBe('ollama');
      expect(status.model).toBe('llama2');
    });
  });

  describe('getProviderStatus', () => {
    it('should return error status when no provider configured', async () => {
      const status = await adapter.getProviderStatus();

      expect(status.connected).toBe(false);
      expect(status.provider).toBe('none');
      expect(status.error).toBe('No provider configured');
    });

    it('should return connected status for configured provider', async () => {
      adapter.setProvider({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const status = await adapter.getProviderStatus();

      expect(status.connected).toBe(true);
      expect(status.provider).toBe('openai');
      expect(status.model).toBe('gpt-4');
    });
  });

  describe('complete', () => {
    it('should throw if no provider configured', async () => {
      await expect(
        adapter.complete({ messages: [] })
      ).rejects.toThrow('No LLM provider configured');
    });

    it('should complete with OpenAI provider', async () => {
      adapter.setProvider({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const response = await adapter.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response).toBeDefined();
      expect(response.model).toBe('gpt-4');
    });

    it('should complete with Anthropic provider', async () => {
      adapter.setProvider({
        type: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-opus-4',
      });

      const response = await adapter.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response).toBeDefined();
      expect(response.model).toBe('claude-opus-4');
    });

    it('should complete with Ollama provider', async () => {
      adapter.setProvider({
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      });

      const response = await adapter.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response).toBeDefined();
      expect(response.model).toBe('llama2');
    });
  });

  describe('stream', () => {
    it('should throw if no provider configured', async () => {
      expect(() => {
        adapter.stream({ messages: [] });
      }).toThrow('No LLM provider configured');
    });

    it('should stream with OpenAI provider', async () => {
      adapter.setProvider({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const chunks: string[] = [];
      for await (const chunk of adapter.stream({
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        chunks.push(chunk.content);
        if (chunk.done) break;
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Ollama local address validation (Property 9)', () => {
    it('should accept localhost address', async () => {
      adapter.setProvider({
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      });

      await expect(
        adapter.complete({ messages: [] })
      ).resolves.toBeDefined();
    });

    it('should accept 127.0.0.1 address', async () => {
      adapter.setProvider({
        type: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama2',
      });

      await expect(
        adapter.complete({ messages: [] })
      ).resolves.toBeDefined();
    });

    it('should reject non-local address', async () => {
      adapter.setProvider({
        type: 'ollama',
        baseUrl: 'http://example.com:11434',
        model: 'llama2',
      });

      await expect(
        adapter.complete({ messages: [] })
      ).rejects.toThrow('Ollama provider must use local address');
    });
  });

  describe('listModels', () => {
    it('should return empty array when no provider configured', async () => {
      const models = await adapter.listModels();
      expect(models).toEqual([]);
    });

    it('should list OpenAI models', async () => {
      adapter.setProvider({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const models = await adapter.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('openai');
    });

    it('should list Anthropic models', async () => {
      adapter.setProvider({
        type: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-opus-4',
      });

      const models = await adapter.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('anthropic');
    });

    it('should list Ollama models', async () => {
      adapter.setProvider({
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      });

      const models = await adapter.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('ollama');
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getLLMAdapter();
      const instance2 = getLLMAdapter();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getLLMAdapter();
      resetLLMAdapter();
      const instance2 = getLLMAdapter();

      expect(instance1).not.toBe(instance2);
    });
  });
});
