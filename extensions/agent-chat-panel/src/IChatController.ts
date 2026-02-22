/**
 * Chat Controller interface
 * Manages conversation with AI and message history
 */

export interface IChatController {
  /**
   * Send a message and get AI response
   */
  sendMessage(message: string, context?: ChatContext): Promise<ChatResponse>;

  /**
   * Clear current session
   */
  clearSession(): Promise<void>;

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[];

  /**
   * Load existing session
   */
  loadSession(sessionId: string): Promise<boolean>;

  /**
   * Get current session ID
   */
  getSessionId(): string;
}

export interface ChatContext {
  activeFile?: string;
  selectedCode?: string;
  referencedFiles?: string[];
  workspaceRoot: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: ChatAttachment[];
}

export interface ChatResponse {
  message: ChatMessage;
  agentTask?: AgentTaskRequest;
}

export interface ChatAttachment {
  type: 'file' | 'code' | 'screenshot' | 'diff';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTaskRequest {
  description: string;
  context: ChatContext;
  constraints?: TaskConstraint[];
}

export interface TaskConstraint {
  type: string;
  value: unknown;
}
