import {
  IChatController,
  ChatContext,
  ChatMessage,
  ChatResponse,
  AgentTaskRequest,
} from './IChatController';
import { getLLMAdapter } from '../../shared-services/src/LLMAdapter';
import { getContextAnalyzer } from '../../shared-services/src/ContextAnalyzer';
import { getChatHistoryStorage, ChatSession } from '../../shared-services/src/ChatHistoryStorage';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';

/**
 * Chat Controller implementation
 */
export class ChatController implements IChatController {
  private history: ChatMessage[] = [];
  private sessionId: string;
  private sessionTitle: string = 'New Chat';
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.sessionId = uuidv4();
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(message: string, context?: ChatContext): Promise<ChatResponse> {
    // Add user message to history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    this.history.push(userMessage);

    // Build context if provided
    let contextInfo = '';
    if (context) {
      const analyzer = getContextAnalyzer();
      const analyzedContext = await analyzer.buildContext({
        activeFile: context.activeFile as unknown as boolean,
        selectedCode: context.selectedCode,
        referencedFiles: context.referencedFiles,
      });

      if (analyzedContext.files.length > 0) {
        contextInfo = '\n\n--- Context ---\n';
        for (const file of analyzedContext.files) {
          contextInfo += `\nFile: ${file.path}\n${file.content}\n`;
        }
      }
    }

    // Call LLM
    const llmAdapter = getLLMAdapter();
    const llmResponse = await llmAdapter.complete({
      messages: [
        {
          role: 'system',
          content:
            'You are Miaoda, an AI coding assistant. Help users with their coding tasks.',
        },
        ...this.history.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        {
          role: 'user',
          content: message + contextInfo,
        },
      ],
    });

    // Add assistant message to history
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: llmResponse.content,
      timestamp: Date.now(),
    };
    this.history.push(assistantMessage);

    // Auto-generate title from first message
    if (this.history.length === 2) {
      this.sessionTitle = this.generateTitle(message);
    }

    // Save session to storage
    await this.saveSession();

    // Detect if AI wants to trigger an agent task
    const agentTask = this.detectAgentTask(llmResponse.content, context);

    return {
      message: assistantMessage,
      agentTask,
    };
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    this.history = [];
    this.sessionId = uuidv4();
    this.sessionTitle = 'New Chat';
  }

  /**
   * Load existing session
   */
  async loadSession(sessionId: string): Promise<boolean> {
    const storage = getChatHistoryStorage(this.context);
    const session = await storage.loadSession(sessionId);

    if (session) {
      this.sessionId = session.id;
      this.sessionTitle = session.title;
      this.history = session.messages;
      return true;
    }

    return false;
  }

  /**
   * Save current session
   */
  private async saveSession(): Promise<void> {
    const storage = getChatHistoryStorage(this.context);
    const session: ChatSession = {
      id: this.sessionId,
      title: this.sessionTitle,
      messages: this.history,
      createdAt: this.history[0]?.timestamp || Date.now(),
      updatedAt: Date.now(),
    };
    await storage.saveSession(session);
  }

  /**
   * Generate title from first message
   */
  private generateTitle(message: string): string {
    const maxLength = 50;
    const cleaned = message.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned;
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Detect if AI response contains agent task trigger
   */
  private detectAgentTask(
    content: string,
    context?: ChatContext
  ): AgentTaskRequest | undefined {
    // Simple detection: look for action keywords
    const actionKeywords = [
      'let me implement',
      'i will create',
      'i can build',
      'let me write',
      'i will generate',
    ];

    const lowerContent = content.toLowerCase();
    const hasActionKeyword = actionKeywords.some((keyword) => lowerContent.includes(keyword));

    if (hasActionKeyword && context) {
      return {
        description: content,
        context,
      };
    }

    return undefined;
  }
}

/**
 * Singleton instance
 */
let chatControllerInstance: ChatController | undefined;

export function getChatController(context: vscode.ExtensionContext): ChatController {
  if (!chatControllerInstance) {
    chatControllerInstance = new ChatController(context);
  }
  return chatControllerInstance;
}

export function resetChatController(): void {
  chatControllerInstance = undefined;
}
