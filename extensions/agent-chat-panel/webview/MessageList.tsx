import React, { useEffect, useRef } from 'react';
import { Message } from './types';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        return null; // Handle in a more sophisticated way if needed
      }
      // Inline code
      if (line.includes('`')) {
        const parts = line.split('`');
        return (
          <p key={index}>
            {parts.map((part, i) =>
              i % 2 === 0 ? part : <code key={i}>{part}</code>
            )}
          </p>
        );
      }
      // Regular text
      return line ? <p key={index}>{line}</p> : <br key={index} />;
    });
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list empty">
        <div className="empty-state">
          <span className="codicon codicon-comment-discussion"></span>
          <h3>Start a conversation</h3>
          <p>Ask me anything about your code or project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message message-${message.role}`}>
          <div className="message-header">
            <span className="message-role">
              {message.role === 'user' ? (
                <span className="codicon codicon-account"></span>
              ) : (
                <span className="codicon codicon-hubot"></span>
              )}
              {message.role === 'user' ? 'You' : 'Miaoda'}
            </span>
            <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
          </div>
          <div className="message-content">
            {renderMessageContent(message.content)}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="message message-assistant loading">
          <div className="message-header">
            <span className="message-role">
              <span className="codicon codicon-hubot"></span>
              Miaoda
            </span>
          </div>
          <div className="message-content">
            <div className="loading-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
