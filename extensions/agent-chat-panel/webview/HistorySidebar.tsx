import React, { useState } from 'react';
import { ChatSession } from './types';
import './HistorySidebar.css';

interface HistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  sessions,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = formatDate(session.updatedAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className="history-sidebar">
      <div className="sidebar-header">
        <h3>Chat History</h3>
        <button className="icon-button" onClick={onClose} title="Close">
          <span className="codicon codicon-close"></span>
        </button>
      </div>

      <div className="sidebar-search">
        <span className="codicon codicon-search"></span>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-content">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="empty-history">
            <span className="codicon codicon-inbox"></span>
            <p>No chat history found</p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([date, sessions]) => (
            <div key={date} className="session-group">
              <div className="group-header">{date}</div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                >
                  <button
                    className="session-button"
                    onClick={() => onLoadSession(session.id)}
                    title={session.title}
                  >
                    <span className="codicon codicon-comment-discussion"></span>
                    <span className="session-title">{session.title}</span>
                    <span className="session-count">{session.messages.length}</span>
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${session.title}"?`)) {
                        onDeleteSession(session.id);
                      }
                    }}
                    title="Delete session"
                  >
                    <span className="codicon codicon-trash"></span>
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
