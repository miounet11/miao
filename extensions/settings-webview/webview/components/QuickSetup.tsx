import React, { useState } from 'react';
import { ProviderPreset } from '../types';
import '../styles/components.css';

interface QuickSetupProps {
  presets: ProviderPreset[];
  onCreateFromPreset: (presetId: string, apiKey?: string, customUrl?: string) => void;
  loading: boolean;
}

const QuickSetup: React.FC<QuickSetupProps> = ({ presets, onCreateFromPreset, loading }) => {
  const [selectedPreset, setSelectedPreset] = useState<ProviderPreset | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSelectPreset = (preset: ProviderPreset) => {
    setSelectedPreset(preset);
    setCustomUrl(preset.defaultApiUrl);
    setApiKey('');
  };

  const handleCreate = () => {
    if (selectedPreset) {
      onCreateFromPreset(
        selectedPreset.id,
        apiKey || undefined,
        customUrl !== selectedPreset.defaultApiUrl ? customUrl : undefined
      );
      setSelectedPreset(null);
      setApiKey('');
      setCustomUrl('');
    }
  };

  return (
    <div className="quick-setup">
      <div className="setup-header">
        <h2>Quick Setup</h2>
        <p>Choose a provider template to quickly configure a model</p>
      </div>

      {!selectedPreset ? (
        <div className="presets-grid">
          {presets.map(preset => (
            <div
              key={preset.id}
              className="preset-card"
              onClick={() => handleSelectPreset(preset)}
            >
              <div className="preset-icon">
                {preset.provider === 'openai' && '🤖'}
                {preset.provider === 'anthropic' && '🧠'}
                {preset.provider === 'ollama' && '🦙'}
                {preset.provider === 'google' && '🔍'}
                {preset.provider === 'deepseek' && '🔬'}
                {preset.provider === 'azure' && '☁️'}
              </div>
              <h3>{preset.name}</h3>
              <p className="preset-name-cn">{preset.nameCN}</p>
              <p className="preset-model">{preset.defaultModel}</p>
              {preset.requiresApiKey && (
                <span className="badge badge-warning">Requires API Key</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="preset-config">
          <div className="config-header">
            <button className="btn btn-link" onClick={() => setSelectedPreset(null)}>
              ← Back to Presets
            </button>
            <h3>Configure {selectedPreset.name}</h3>
          </div>

          <div className="config-form">
            <div className="info-box">
              <h4>Instructions</h4>
              <p>{selectedPreset.instructions}</p>
              <p className="info-cn">{selectedPreset.instructionsCN}</p>
            </div>

            <div className="form-group">
              <label htmlFor="apiUrl">API URL</label>
              <input
                id="apiUrl"
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={selectedPreset.defaultApiUrl}
              />
            </div>

            {selectedPreset.requiresApiKey && (
              <div className="form-group">
                <label htmlFor="apiKey">API Key *</label>
                <div className="input-with-toggle">
                  <input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedPreset(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading || (selectedPreset.requiresApiKey && !apiKey)}
              >
                {loading ? 'Creating...' : 'Create Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickSetup;
