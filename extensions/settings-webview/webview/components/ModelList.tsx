import React from 'react';
import { ModelConfig } from '../types';
import '../styles/components.css';

interface ModelListProps {
  models: ModelConfig[];
  activeModelId: string | null;
  onSetActive: (modelId: string) => void;
  onEdit: (model: ModelConfig) => void;
  onDelete: (modelId: string) => void;
  onTest: (modelId: string) => void;
  onAddNew: () => void;
}

const ModelList: React.FC<ModelListProps> = ({
  models,
  activeModelId,
  onSetActive,
  onEdit,
  onDelete,
  onTest,
  onAddNew
}) => {
  return (
    <div className="model-list">
      <div className="list-header">
        <h2>Configured Models</h2>
        <button className="btn btn-primary" onClick={onAddNew}>
          + Add New Model
        </button>
      </div>

      {models.length === 0 ? (
        <div className="empty-state">
          <p>No models configured yet.</p>
          <button className="btn btn-primary" onClick={onAddNew}>
            Add Your First Model
          </button>
        </div>
      ) : (
        <div className="models-grid">
          {models.map(model => (
            <div key={model.id} className={`model-card ${activeModelId === model.id ? 'active' : ''}`}>
              <div className="model-header">
                <div className="model-info">
                  <input
                    type="radio"
                    name="activeModel"
                    checked={activeModelId === model.id}
                    onChange={() => onSetActive(model.id)}
                    className="model-radio"
                  />
                  <div>
                    <h3>{model.name}</h3>
                    {model.nameCN && <p className="model-name-cn">{model.nameCN}</p>}
                  </div>
                </div>
                <span className={`badge badge-${model.provider}`}>{model.provider}</span>
              </div>

              <div className="model-details">
                <div className="detail-row">
                  <span className="label">Model:</span>
                  <span className="value">{model.model}</span>
                </div>
                <div className="detail-row">
                  <span className="label">API URL:</span>
                  <span className="value truncate">{model.apiUrl}</span>
                </div>
                {model.description && (
                  <div className="detail-row">
                    <span className="label">Description:</span>
                    <span className="value">{model.description}</span>
                  </div>
                )}
                {model.contextWindow && (
                  <div className="detail-row">
                    <span className="label">Context:</span>
                    <span className="value">{model.contextWindow.toLocaleString()} tokens</span>
                  </div>
                )}
              </div>

              <div className="model-actions">
                <button className="btn btn-small" onClick={() => onTest(model.id)}>
                  Test Connection
                </button>
                <button className="btn btn-small" onClick={() => onEdit(model)}>
                  Edit
                </button>
                {model.source === 'user' && (
                  <button className="btn btn-small btn-danger" onClick={() => onDelete(model.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelList;
