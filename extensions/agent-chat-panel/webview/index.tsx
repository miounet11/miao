import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatView } from './ChatView';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ChatView />
  </React.StrictMode>
);
