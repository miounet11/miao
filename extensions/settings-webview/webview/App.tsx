import React, { useState, useEffect } from 'react';
import ModelList from './components/ModelList';
import ModelForm from './components/ModelForm';
import QuickSetup from './components/QuickSetup';
import CloudSync from './components/CloudSync';
import ImportExport from './components/ImportExport';
import AdvancedSettings from './components/AdvancedSettings';
import { ModelConfig, ProviderPreset, MembershipTier } from './types';
import './styles/App.css';

declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

type Tab = 'models' | 'quick-setup' | 'cloud-sync' | 'import-export' | 'advanced';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [membership, setMembership] = useState<MembershipTier>('free');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request initial data
    vscode.postMessage({ type: 'getAllModels' });
    vscode.postMessage({ type: 'getActiveModel' });
    vscode.postMessage({ type: 'getPresets' });
    vscode.postMessage({ type: 'getMembership' });

    // Listen for messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'allModels':
          setModels(message.models);
          break;
        case 'activeModel':
          setActiveModelId(message.modelId);
          break;
        case 'modelAdded':
          setModels(prev => [...prev, message.model]);
          showNotification('success', 'Model added successfully');
          setEditingModel(null);
          break;
        case 'modelUpdated':
          setModels(prev => prev.map(m => m.id === message.model.id ? message.model : m));
          showNotification('success', 'Model updated successfully');
          setEditingModel(null);
          break;
        case 'modelDeleted':
          setModels(prev => prev.filter(m => m.id !== message.modelId));
          showNotification('success', 'Model deleted successfully');
          break;
        case 'presets':
          setPresets(message.presets);
          break;
        case 'membership':
          setMembership(message.tier);
          break;
        case 'success':
          showNotification('success', message.message);
          setLoading(false);
          break;
        case 'error':
          showNotification('error', message.message);
          setLoading(false);
          break;
        case 'showQuickSetup':
          setActiveTab('quick-setup');
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSetActive = (modelId: string) => {
    vscode.postMessage({ type: 'setActiveModel', modelId });
    setActiveModelId(modelId);
  };

  const handleEdit = (model: ModelConfig) => {
    setEditingModel(model);
  };

  const handleDelete = (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      vscode.postMessage({ type: 'deleteModel', modelId });
    }
  };

  const handleTest = (modelId: string) => {
    setLoading(true);
    vscode.postMessage({ type: 'testConnection', modelId });
  };

  const handleSave = (config: Partial<ModelConfig>) => {
    if (editingModel) {
      vscode.postMessage({ type: 'updateModel', modelId: editingModel.id, updates: config });
    } else {
      vscode.postMessage({ type: 'addModel', config });
    }
  };

  const handleCancel = () => {
    setEditingModel(null);
  };

  const handleCreateFromPreset = (presetId: string, apiKey?: string, customUrl?: string) => {
    setLoading(true);
    vscode.postMessage({ type: 'createFromPreset', presetId, apiKey, customUrl });
  };

  const handleExport = () => {
    vscode.postMessage({ type: 'exportConfig' });
  };

  const handleImport = (data: string) => {
    vscode.postMessage({ type: 'importConfig', data });
  };

  const handleSyncCloud = () => {
    setLoading(true);
    vscode.postMessage({ type: 'syncCloud' });
  };

  return (
    <div className="settings-container">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          Models
        </button>
        <button
          className={`tab ${activeTab === 'quick-setup' ? 'active' : ''}`}
          onClick={() => setActiveTab('quick-setup')}
        >
          Quick Setup
        </button>
        <button
          className={`tab ${activeTab === 'cloud-sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('cloud-sync')}
        >
          Cloud Sync
        </button>
        <button
          className={`tab ${activeTab === 'import-export' ? 'active' : ''}`}
          onClick={() => setActiveTab('import-export')}
        >
          Import/Export
        </button>
        <button
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'models' && (
          editingModel || models.length === 0 ? (
            <ModelForm
              model={editingModel}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <ModelList
              models={models}
              activeModelId={activeModelId}
              onSetActive={handleSetActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTest={handleTest}
              onAddNew={() => setEditingModel({} as ModelConfig)}
            />
          )
        )}

        {activeTab === 'quick-setup' && (
          <QuickSetup
            presets={presets}
            onCreateFromPreset={handleCreateFromPreset}
            loading={loading}
          />
        )}

        {activeTab === 'cloud-sync' && (
          <CloudSync
            membership={membership}
            onSync={handleSyncCloud}
            loading={loading}
          />
        )}

        {activeTab === 'import-export' && (
          <ImportExport
            onExport={handleExport}
            onImport={handleImport}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedSettings />
        )}
      </div>
    </div>
  );
};

export default App;
