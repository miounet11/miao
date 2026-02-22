import React, { useState } from 'react';
import '../styles/components.css';

interface ImportExportProps {
  onExport: () => void;
  onImport: (data: string) => void;
}

const ImportExport: React.FC<ImportExportProps> = ({ onExport, onImport }) => {
  const [importData, setImportData] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (importData) {
      try {
        JSON.parse(importData); // Validate JSON
        onImport(importData);
        setImportData('');
      } catch (error) {
        alert('Invalid JSON format');
      }
    }
  };

  return (
    <div className="import-export">
      <div className="ie-header">
        <h2>Import / Export</h2>
        <p>Backup and restore your configuration</p>
      </div>

      <div className="ie-section">
        <div className="section-card">
          <div className="card-icon">📤</div>
          <h3>Export Configuration</h3>
          <p>Download your current model configurations as a JSON file</p>
          <p className="info-cn">将当前模型配置下载为 JSON 文件</p>
          <button className="btn btn-primary" onClick={onExport}>
            Export to JSON
          </button>
        </div>

        <div className="section-card">
          <div className="card-icon">📥</div>
          <h3>Import Configuration</h3>
          <p>Upload a configuration file to restore your settings</p>
          <p className="info-cn">上传配置文件以恢复您的设置</p>

          <div
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <p>Drag and drop a JSON file here</p>
              <p>or</p>
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                Choose File
              </label>
            </div>
          </div>

          {importData && (
            <div className="import-preview">
              <h4>Preview</h4>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={10}
                className="json-preview"
              />
              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setImportData('')}>
                  Clear
                </button>
                <button className="btn btn-primary" onClick={handleImport}>
                  Import Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ie-info">
        <h3>Important Notes</h3>
        <ul>
          <li>⚠️ Importing will merge with existing configurations</li>
          <li>🔒 API keys are stored securely in the system keychain</li>
          <li>💾 Export files do not include API keys for security</li>
          <li>✓ You can edit the JSON file before importing</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportExport;
