import React, { useState } from 'react';
import '../styles/components.css';

const AdvancedSettings: React.FC = () => {
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [timeout, setTimeout] = useState(30000);
  const [retryAttempts, setRetryAttempts] = useState(3);

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const handleSave = () => {
    // Save advanced settings
    alert('Advanced settings saved!');
  };

  return (
    <div className="advanced-settings">
      <div className="advanced-header">
        <h2>Advanced Settings</h2>
        <p>Configure advanced options for model connections</p>
      </div>

      <div className="settings-section">
        <h3>Custom Headers</h3>
        <p className="section-description">Add custom HTTP headers to all API requests</p>
        <p className="info-cn">为所有 API 请求添加自定义 HTTP 头</p>

        <div className="headers-list">
          {customHeaders.map((header, index) => (
            <div key={index} className="header-row">
              <input
                type="text"
                placeholder="Header name"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                className="header-input"
              />
              <input
                type="text"
                placeholder="Header value"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                className="header-input"
              />
              <button
                className="btn btn-small btn-danger"
                onClick={() => removeHeader(index)}
                disabled={customHeaders.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={addHeader}>
          + Add Header
        </button>
      </div>

      <div className="settings-section">
        <h3>Proxy Settings</h3>
        <p className="section-description">Configure HTTP proxy for API requests</p>
        <p className="info-cn">为 API 请求配置 HTTP 代理</p>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={proxyEnabled}
              onChange={(e) => setProxyEnabled(e.target.checked)}
            />
            Enable Proxy
          </label>
        </div>

        {proxyEnabled && (
          <div className="form-group">
            <label htmlFor="proxyUrl">Proxy URL</label>
            <input
              id="proxyUrl"
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://proxy.example.com:8080"
            />
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Rate Limiting</h3>
        <p className="section-description">Control the rate of API requests</p>
        <p className="info-cn">控制 API 请求速率</p>

        <div className="form-group">
          <label htmlFor="rateLimit">Requests per minute</label>
          <div className="slider-group">
            <input
              id="rateLimit"
              type="range"
              min="1"
              max="120"
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value))}
              className="slider-input"
            />
            <span className="slider-value">{rateLimit}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Connection Settings</h3>
        <p className="section-description">Configure timeout and retry behavior</p>
        <p className="info-cn">配置超时和重试行为</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="timeout">Timeout (ms)</label>
            <input
              id="timeout"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value))}
              min="1000"
              max="300000"
              step="1000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="retryAttempts">Retry Attempts</label>
            <input
              id="retryAttempts"
              type="number"
              value={retryAttempts}
              onChange={(e) => setRetryAttempts(parseInt(e.target.value))}
              min="0"
              max="10"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Debug Options</h3>
        <p className="section-description">Enable debugging features</p>
        <p className="info-cn">启用调试功能</p>

        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" />
            Log API requests
          </label>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" />
            Log API responses
          </label>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" />
            Show detailed error messages
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary">Reset to Defaults</button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Advanced Settings
        </button>
      </div>
    </div>
  );
};

export default AdvancedSettings;
