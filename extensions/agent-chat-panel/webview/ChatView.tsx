import React, { useState, useEffect, useCallback } from 'react';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { HistorySidebar } from './HistorySidebar';
import { Message, ChatSession, WebviewMessage, VSCodeAPI } from './types';
import './ChatView.css';

const vscode: VSCodeAPI = window.acquireVsCodeApi();

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<WebviewMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'init':
          setMessages(message.payload.messages || []);
          setCurrentSessionId(message.payload.sessionId || '');
          break;

        case 'newMessage':
          setMessages((prev) => [...prev, message.payload]);
          setIsLoading(false);
          break;

        case 'loadSessions':
          setSessions(message.payload);
          break;

        case 'sessionLoaded':
          setMessages(message.payload.messages);
          setCurrentSessionId(message.payload.sessionId);
          setIsSidebarOpen(false);
          break;

        case 'error':
          setError(message.payload.message);
          setIsLoading(false);
          break;

        case 'clearError':
          setError(null);
          break;

        case 'sessionCleared':
          setMessages([]);
          setCurrentSessionId(message.payload.sessionId);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial state
    vscode.postMessage({ type: 'ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    vscode.postMessage({
      type: 'sendMessage',
      payload: { content },
    });
  }, []);

  const handleNewSession = useCallback(() => {
    vscode.postMessage({ type: 'newSession' });
  }, []);

  const handleLoadSession = useCallback((sessionId: string) => {
    vscode.postMessage({
      type: 'loadSession',
      payload: { sessionId },
    });
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    vscode.postMessage({
      type: 'deleteSession',
      payload: { sessionId },
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      vscode.postMessage({ type: 'loadSessions' });
    }
    setIsSidebarOpen((prev) => !prev);
  }, [isSidebarOpen]);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="chat-view">
      <div className="chat-header">
        <button
          className="icon-button"
          onClick={handleToggleSidebar}
          title="Toggle History"
        >
          <span className="codicon codicon-history"></span>
        </button>
        <h2 className="chat-title">Miaoda Chat</h2>
        <button
          className="icon-button"
          onClick={handleNewSession}
          title="New Chat"
        >
          <span className="codicon codicon-add"></span>
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={handleClearError}>
            <span className="codicon codicon-close"></span>
          </button>
        </div>
      )}

      <div className="chat-container">
        {isSidebarOpen && (
          <HistorySidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onLoadSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="chat-main">
          <MessageList messages={messages} isLoading={isLoading} />
          <InputBox onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};
