import React, { useState, useEffect } from 'react';
import { ModelConfig, ProviderType } from '../types';
import '../styles/components.css';

interface ModelFormProps {
  model: ModelConfig | null;
  onSave: (config: Partial<ModelConfig>) => void;
  onCancel: () => void;
}

const ModelForm: React.FC<ModelFormProps> = ({ model, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    nameCN: '',
    provider: 'openai' as ProviderType,
    apiUrl: '',
    model: '',
    apiKey: '',
    maxTokens: 4096,
    temperature: 0.7,
    streaming: true,
    description: '',
    descriptionCN: ''
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (model && model.id) {
      setFormData({
        name: model.name || '',
        nameCN: model.nameCN || '',
        provider: model.provider || 'openai',
        apiUrl: model.apiUrl || '',
        model: model.model || '',
        apiKey: model.apiKey || '',
        maxTokens: model.maxTokens || 4096,
        temperature: model.temperature || 0.7,
        streaming: model.streaming !== false,
        description: model.description || '',
        descriptionCN: model.descriptionCN || ''
      });
    }
  }, [model]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.apiUrl.trim()) {
      newErrors.apiUrl = 'API URL is required';
    } else {
      try {
        new URL(formData.apiUrl);
      } catch {
        newErrors.apiUrl = 'Invalid URL format';
      }
    }
    if (!formData.model.trim()) {
      newErrors.model = 'Model identifier is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="model-form">
      <div className="form-header">
        <h2>{model?.id ? 'Edit Model' : 'Add New Model'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'error' : ''}
              placeholder="e.g., GPT-4"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="nameCN">Chinese Name</label>
            <input
              id="nameCN"
              type="text"
              value={formData.nameCN}
              onChange={(e) => handleChange('nameCN', e.target.value)}
              placeholder="中文名称"
            />
          </div>

          <div className="form-group">
            <label htmlFor="provider">Provider *</label>
            <select
              id="provider"
              value={formData.provider}
              onChange={(e) => handleChange('provider', e.target.value as ProviderType)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
              <option value="azure">Azure</option>
              <option value="google">Google</option>
              <option value="deepseek">DeepSeek</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>API Configuration</h3>

          <div className="form-group">
            <label htmlFor="apiUrl">API URL *</label>
            <input
              id="apiUrl"
              type="text"
              value={formData.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
              className={errors.apiUrl ? 'error' : ''}
              placeholder="https://api.example.com/v1"
            />
            {errors.apiUrl && <span className="error-message">{errors.apiUrl}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="model">Model Identifier *</label>
            <input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className={errors.model ? 'error' : ''}
              placeholder="gpt-4, claude-opus-4, etc."
            />
            {errors.model && <span className="error-message">{errors.model}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <div className="input-with-toggle">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="sk-..."
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
        </div>

        <div className="form-section">
          <h3>Model Parameters</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxTokens">Max Tokens</label>
              <input
                id="maxTokens"
                type="number"
                value={formData.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                min="1"
                max="1000000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature">Temperature</label>
              <input
                id="temperature"
                type="number"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.streaming}
                onChange={(e) => handleChange('streaming', e.target.checked)}
              />
              Enable Streaming
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Description</h3>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of this model"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="descriptionCN">Chinese Description</label>
            <textarea
              id="descriptionCN"
              value={formData.descriptionCN}
              onChange={(e) => handleChange('descriptionCN', e.target.value)}
              placeholder="模型的简要描述"
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {model?.id ? 'Update Model' : 'Add Model'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ModelForm;
