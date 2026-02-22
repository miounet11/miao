import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface IChatHistoryStorage {
  saveSession(session: ChatSession): Promise<void>;
  loadSession(sessionId: string): Promise<ChatSession | undefined>;
  listSessions(): Promise<ChatSession[]>;
  deleteSession(sessionId: string): Promise<void>;
  searchSessions(query: string): Promise<ChatSession[]>;
}

/**
 * File-based chat history storage
 */
export class ChatHistoryStorage implements IChatHistoryStorage {
  private storageDir: string;

  constructor(context: vscode.ExtensionContext) {
    this.storageDir = path.join(context.globalStorageUri.fsPath, 'chat-history');
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.storageDir, `${sessionId}.json`);
  }

  async saveSession(session: ChatSession): Promise<void> {
    const sessionPath = this.getSessionPath(session.id);
    const data = JSON.stringify(session, null, 2);
    await fs.promises.writeFile(sessionPath, data, 'utf8');
  }

  async loadSession(sessionId: string): Promise<ChatSession | undefined> {
    const sessionPath = this.getSessionPath(sessionId);

    if (!fs.existsSync(sessionPath)) {
      return undefined;
    }

    const data = await fs.promises.readFile(sessionPath, 'utf8');
    return JSON.parse(data) as ChatSession;
  }

  async listSessions(): Promise<ChatSession[]> {
    const files = await fs.promises.readdir(this.storageDir);
    const sessions: ChatSession[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        const session = await this.loadSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
    }

    // Sort by updatedAt descending
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionPath = this.getSessionPath(sessionId);
    if (fs.existsSync(sessionPath)) {
      await fs.promises.unlink(sessionPath);
    }
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    const allSessions = await this.listSessions();
    const lowerQuery = query.toLowerCase();

    return allSessions.filter((session) => {
      // Search in title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in message content
      return session.messages.some((msg) =>
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }
}

/**
 * Singleton instance
 */
let storageInstance: ChatHistoryStorage | undefined;

export function getChatHistoryStorage(context: vscode.ExtensionContext): ChatHistoryStorage {
  if (!storageInstance) {
    storageInstance = new ChatHistoryStorage(context);
  }
  return storageInstance;
}

export function resetChatHistoryStorage(): void {
  storageInstance = undefined;
}
