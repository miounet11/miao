import * as fs from 'fs';
import * as path from 'path';
import type { ProjectConfig, SessionRecord } from '../types';

/**
 * SessionManager - Tracks development sessions
 */
export class SessionManager {
  private config: ProjectConfig;
  private sessionsDir: string;
  private currentSession: SessionRecord | null = null;
  private sessionStartTime: number = 0;

  constructor(config: ProjectConfig) {
    this.config = config;
    this.sessionsDir = path.join(config.miaodaDir, 'history', 'sessions');
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    // Load today's session if exists
    await this.loadTodaySession();
  }

  /**
   * Start a new session
   */
  async startSession(): Promise<SessionRecord> {
    const now = Date.now();
    const sessionId = `session-${now}`;

    this.currentSession = {
      id: sessionId,
      startTime: now,
      filesModified: 0,
      aiConversations: 0,
      commandsRun: 0,
    };

    this.sessionStartTime = now;
    return this.currentSession;
  }

  /**
   * End current session
   */
  async endSession(): Promise<SessionRecord | undefined> {
    if (!this.currentSession) {
      return undefined;
    }

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.currentSession.startTime;

    await this.saveSession(this.currentSession);
    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<SessionRecord | null> {
    if (!this.currentSession) {
      return null;
    }

    // Update duration
    const now = Date.now();
    return {
      ...this.currentSession,
      duration: now - this.currentSession.startTime,
    };
  }

  /**
   * Record file modification
   */
  async recordFileModification(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.filesModified++;
    }
  }

  /**
   * Record AI conversation
   */
  async recordAIConversation(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.aiConversations++;
    }
  }

  /**
   * Record command execution
   */
  async recordCommandExecution(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.commandsRun++;
    }
  }

  /**
   * Save session to disk
   */
  private async saveSession(session: SessionRecord): Promise<void> {
    const date = new Date(session.startTime);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fileName = `${dateStr}.json`;
    const filePath = path.join(this.sessionsDir, fileName);

    let sessions: SessionRecord[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        sessions = JSON.parse(content);
      } catch (error) {
        console.error('Failed to load existing sessions:', error);
      }
    }

    // Add or update session
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
  }

  /**
   * Load today's session
   */
  private async loadTodaySession(): Promise<void> {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fileName = `${dateStr}.json`;
    const filePath = path.join(this.sessionsDir, fileName);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sessions = JSON.parse(content) as SessionRecord[];
        if (sessions.length > 0) {
          // Load the last session
          this.currentSession = sessions[sessions.length - 1];
        }
      } catch (error) {
        console.error('Failed to load today session:', error);
      }
    }
  }

  /**
   * Get sessions for a date
   */
  async getSessionsForDate(date: Date): Promise<SessionRecord[]> {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fileName = `${dateStr}.json`;
    const filePath = path.join(this.sessionsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as SessionRecord[];
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<SessionRecord[]> {
    const sessions: SessionRecord[] = [];

    if (!fs.existsSync(this.sessionsDir)) {
      return sessions;
    }

    const files = fs.readdirSync(this.sessionsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const content = fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8');
        const fileSessions = JSON.parse(content) as SessionRecord[];
        sessions.push(...fileSessions);
      } catch (error) {
        console.error(`Failed to load sessions from ${file}:`, error);
      }
    }

    return sessions.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    if (this.currentSession) {
      await this.endSession();
    }
  }
}
