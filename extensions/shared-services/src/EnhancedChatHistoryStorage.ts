/**
 * Enhanced Chat History Storage
 * Backward-compatible upgrade with SQLite backend, semantic search, and intelligent features
 */

import * as vscode from 'vscode';
import { UnifiedStorage } from './UnifiedStorage';
import { ChatHistoryRecord, ChatSessionRecord, SearchResult } from './DatabaseSchema';
import { ChatMessage, ChatSession, IChatHistoryStorage } from './ChatHistoryStorage';
import { randomUUID } from 'crypto';

export interface EnhancedSearchOptions {
  useSemanticSearch?: boolean;
  projectPath?: string;
  limit?: number;
  timeDecay?: boolean;
}

export interface SessionSummary {
  topics: string[];
  keyDecisions: string[];
  codeChanges: string[];
  nextSteps: string[];
}

/**
 * Enhanced Chat History Storage with SQLite backend
 */
export class EnhancedChatHistoryStorage implements IChatHistoryStorage {
  private storage: UnifiedStorage;
  private currentProjectPath?: string;

  constructor(
    private context: vscode.ExtensionContext,
    storage?: UnifiedStorage
  ) {
    if (storage) {
      this.storage = storage;
    } else {
      this.storage = new UnifiedStorage(context);
    }

    // Get current workspace folder
    this.updateCurrentProjectPath();

    // Listen for workspace changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.updateCurrentProjectPath();
      })
    );
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  private updateCurrentProjectPath(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    this.currentProjectPath = workspaceFolder?.uri.fsPath;
  }

  // ==================== IChatHistoryStorage Implementation ====================

  async saveSession(session: ChatSession): Promise<void> {
    // Convert to new format
    const sessionRecord: ChatSessionRecord = {
      id: session.id,
      title: session.title,
      project_path: this.currentProjectPath,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      message_count: session.messages.length,
      summary: undefined
    };

    await this.storage.saveChatSession(sessionRecord);

    // Save messages
    for (const message of session.messages) {
      const messageRecord: ChatHistoryRecord = {
        id: message.id,
        session_id: session.id,
        project_path: this.currentProjectPath,
        role: message.role,
        content: message.content,
        created_at: message.timestamp
      };

      // Generate embeddings for important messages (user queries and assistant responses)
      const shouldEmbed = message.role === 'user' || message.role === 'assistant';
      await this.storage.saveChatMessage(messageRecord, shouldEmbed);
    }
  }

  async loadSession(sessionId: string): Promise<ChatSession | undefined> {
    const sessionRecord = await this.storage.getChatSession(sessionId);
    if (!sessionRecord) {
      return undefined;
    }

    const messageRecords = await this.storage.getChatMessages(sessionId);

    // Convert to old format
    const session: ChatSession = {
      id: sessionRecord.id,
      title: sessionRecord.title,
      messages: messageRecords.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      })),
      createdAt: sessionRecord.created_at,
      updatedAt: sessionRecord.updated_at
    };

    return session;
  }

  async listSessions(): Promise<ChatSession[]> {
    const sessionRecords = await this.storage.listChatSessions();
    const sessions: ChatSession[] = [];

    for (const record of sessionRecords) {
      const messageRecords = await this.storage.getChatMessages(record.id);
      sessions.push({
        id: record.id,
        title: record.title,
        messages: messageRecords.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at
        })),
        createdAt: record.created_at,
        updatedAt: record.updated_at
      });
    }

    return sessions;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.storage.deleteChatSession(sessionId);
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    // Use full-text search by default
    const results = await this.storage.searchChatHistory(query, undefined, false);

    // Group by session
    const sessionIds = new Set(results.map(r => r.item.session_id));
    const sessions: ChatSession[] = [];

    for (const sessionId of Array.from(sessionIds)) {
      const session = await this.loadSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  // ==================== Enhanced Features ====================

  /**
   * Search with advanced options including semantic search
   */
  async searchAdvanced(
    query: string,
    options: EnhancedSearchOptions = {}
  ): Promise<SearchResult<ChatSession>[]> {
    const {
      useSemanticSearch = false,
      projectPath = this.currentProjectPath,
      limit = 10,
      timeDecay = true
    } = options;

    // Search messages
    const messageResults = await this.storage.searchChatHistory(
      query,
      projectPath,
      useSemanticSearch
    );

    // Group by session and calculate scores
    const sessionScores = new Map<string, number>();
    const sessionMessages = new Map<string, ChatHistoryRecord[]>();

    for (const result of messageResults) {
      const sessionId = result.item.session_id;
      const currentScore = sessionScores.get(sessionId) || 0;
      sessionScores.set(sessionId, currentScore + result.score);

      if (!sessionMessages.has(sessionId)) {
        sessionMessages.set(sessionId, []);
      }
      sessionMessages.get(sessionId)!.push(result.item);
    }

    // Apply time decay if enabled
    if (timeDecay) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      for (const [sessionId, messages] of Array.from(sessionMessages.entries())) {
        const avgAge = messages.reduce((sum, m) => sum + (now - m.created_at), 0) / messages.length;
        const decayFactor = Math.exp(-avgAge / (30 * oneDay)); // 30-day half-life
        const currentScore = sessionScores.get(sessionId) || 0;
        sessionScores.set(sessionId, currentScore * decayFactor);
      }
    }

    // Load sessions and create results
    const results: SearchResult<ChatSession>[] = [];
    for (const [sessionId, score] of Array.from(sessionScores.entries())) {
      const session = await this.loadSession(sessionId);
      if (session) {
        results.push({ item: session, score });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get sessions for current project
   */
  async getProjectSessions(): Promise<ChatSession[]> {
    if (!this.currentProjectPath) {
      return [];
    }

    const sessionRecords = await this.storage.listChatSessions(this.currentProjectPath);
    const sessions: ChatSession[] = [];

    for (const record of sessionRecords) {
      const session = await this.loadSession(record.id);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Generate session summary
   */
  async summarizeSession(sessionId: string): Promise<SessionSummary> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Extract topics (simplified - in production, use NLP)
    const topics = this.extractTopics(session.messages);

    // Extract key decisions
    const keyDecisions = this.extractKeyDecisions(session.messages);

    // Extract code changes
    const codeChanges = this.extractCodeChanges(session.messages);

    // Extract next steps
    const nextSteps = this.extractNextSteps(session.messages);

    const summary: SessionSummary = {
      topics,
      keyDecisions,
      codeChanges,
      nextSteps
    };

    // Save summary to session
    const sessionRecord = await this.storage.getChatSession(sessionId);
    if (sessionRecord) {
      sessionRecord.summary = JSON.stringify(summary);
      await this.storage.saveChatSession(sessionRecord);
    }

    return summary;
  }

  /**
   * Extract topics from messages (simplified)
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();
    const topicKeywords = ['about', 'regarding', 'question about', 'help with', 'issue with'];

    for (const message of messages) {
      if (message.role === 'user') {
        const content = message.content.toLowerCase();
        for (const keyword of topicKeywords) {
          const index = content.indexOf(keyword);
          if (index !== -1) {
            const topic = content.substring(index + keyword.length, index + keyword.length + 50).trim();
            if (topic) {
              topics.add(topic.split(/[.!?]/)[0]);
            }
          }
        }
      }
    }

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Extract key decisions from messages
   */
  private extractKeyDecisions(messages: ChatMessage[]): string[] {
    const decisions: string[] = [];
    const decisionKeywords = ['decided to', 'will use', 'going to', 'should use', 'recommend'];

    for (const message of messages) {
      if (message.role === 'assistant') {
        const content = message.content;
        for (const keyword of decisionKeywords) {
          const index = content.toLowerCase().indexOf(keyword);
          if (index !== -1) {
            const decision = content.substring(index, index + 100).trim();
            if (decision) {
              decisions.push(decision.split(/[.!?]/)[0]);
            }
          }
        }
      }
    }

    return decisions.slice(0, 5);
  }

  /**
   * Extract code changes from messages
   */
  private extractCodeChanges(messages: ChatMessage[]): string[] {
    const changes: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;

    for (const message of messages) {
      if (message.role === 'assistant') {
        const matches = message.content.match(codeBlockRegex);
        if (matches) {
          changes.push(...matches.map(m => m.substring(0, 100) + '...'));
        }
      }
    }

    return changes.slice(0, 5);
  }

  /**
   * Extract next steps from messages
   */
  private extractNextSteps(messages: ChatMessage[]): string[] {
    const steps: string[] = [];
    const stepKeywords = ['next step', 'todo', 'need to', 'should', 'can try'];

    // Look at the last few messages
    const recentMessages = messages.slice(-5);

    for (const message of recentMessages) {
      const content = message.content.toLowerCase();
      for (const keyword of stepKeywords) {
        const index = content.indexOf(keyword);
        if (index !== -1) {
          const step = message.content.substring(index, index + 100).trim();
          if (step) {
            steps.push(step.split(/[.!?]/)[0]);
          }
        }
      }
    }

    return steps.slice(0, 5);
  }

  /**
   * Find similar conversations
   */
  async findSimilarConversations(
    sessionId: string,
    limit: number = 5
  ): Promise<SearchResult<ChatSession>[]> {
    const session = await this.loadSession(sessionId);
    if (!session || !this.storage.isSemanticSearchAvailable()) {
      return [];
    }

    // Use the first user message as query
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return [];
    }

    const results = await this.searchAdvanced(firstUserMessage.content, {
      useSemanticSearch: true,
      limit: limit + 1 // +1 to account for the current session
    });

    // Filter out the current session
    return results.filter(r => r.item.id !== sessionId).slice(0, limit);
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    projectSessions: number;
  }> {
    const allSessions = await this.listSessions();
    const projectSessions = this.currentProjectPath
      ? await this.getProjectSessions()
      : [];

    const totalMessages = allSessions.reduce((sum, s) => sum + s.messages.length, 0);

    return {
      totalSessions: allSessions.length,
      totalMessages,
      averageMessagesPerSession: allSessions.length > 0 ? totalMessages / allSessions.length : 0,
      projectSessions: projectSessions.length
    };
  }

  /**
   * Export session to markdown
   */
  async exportToMarkdown(sessionId: string): Promise<string> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    let markdown = `# ${session.title}\n\n`;
    markdown += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
    markdown += `Updated: ${new Date(session.updatedAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    for (const message of session.messages) {
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
      markdown += `## ${role}\n\n`;
      markdown += `${message.content}\n\n`;
      markdown += `---\n\n`;
    }

    return markdown;
  }
}

/**
 * Singleton instance
 */
let enhancedStorageInstance: EnhancedChatHistoryStorage | undefined;

export function getEnhancedChatHistoryStorage(
  context: vscode.ExtensionContext,
  storage?: UnifiedStorage
): EnhancedChatHistoryStorage {
  if (!enhancedStorageInstance) {
    enhancedStorageInstance = new EnhancedChatHistoryStorage(context, storage);
  }
  return enhancedStorageInstance;
}

export function resetEnhancedChatHistoryStorage(): void {
  enhancedStorageInstance = undefined;
}
