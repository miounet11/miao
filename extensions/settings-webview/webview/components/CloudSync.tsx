import React, { useState } from 'react';
import { MembershipTier } from '../types';
import '../styles/components.css';

interface CloudSyncProps {
  membership: MembershipTier;
  onSync: () => void;
  loading: boolean;
}

const CloudSync: React.FC<CloudSyncProps> = ({ membership, onSync, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    setIsLoggedIn(true);
  };

  const getMembershipBadge = (tier: MembershipTier) => {
    const badges = {
      free: { label: 'Free', color: 'gray' },
      pro: { label: 'Pro', color: 'blue' },
      enterprise: { label: 'Enterprise', color: 'purple' },
      custom: { label: 'Custom', color: 'gold' }
    };
    return badges[tier];
  };

  const badge = getMembershipBadge(membership);

  return (
    <div className="cloud-sync">
      <div className="sync-header">
        <h2>Cloud Sync</h2>
        <p>Sync your configuration with Miaoda Cloud</p>
      </div>

      {!isLoggedIn ? (
        <div className="login-section">
          <div className="login-card">
            <h3>Sign In to Miaoda Cloud</h3>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Sign In
              </button>
            </form>

            <div className="login-footer">
              <a href="#">Forgot password?</a>
              <span>•</span>
              <a href="#">Create account</a>
            </div>
          </div>

          <div className="benefits-section">
            <h4>Benefits of Cloud Sync</h4>
            <ul>
              <li>✓ Access official model configurations</li>
              <li>✓ Sync settings across devices</li>
              <li>✓ Automatic updates for cloud models</li>
              <li>✓ Premium models for Pro members</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="sync-content">
          <div className="membership-card">
            <div className="membership-header">
              <h3>Membership Status</h3>
              <span className={`badge badge-${badge.color}`}>{badge.label}</span>
            </div>
            <div className="membership-info">
              <p>Email: {email || 'user@example.com'}</p>
              <p>Status: Active</p>
              <p>Last Sync: Just now</p>
            </div>
            {membership === 'free' && (
              <div className="upgrade-prompt">
                <p>Upgrade to Pro for access to premium models</p>
                <button className="btn btn-primary">Upgrade to Pro</button>
              </div>
            )}
          </div>

          <div className="sync-actions">
            <h3>Sync Options</h3>
            <div className="action-card">
              <div className="action-info">
                <h4>Fetch Cloud Defaults</h4>
                <p>Download the latest official model configurations</p>
                <p className="info-cn">下载最新的官方模型配置</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={onSync}
                disabled={loading}
              >
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            <div className="action-card">
              <div className="action-info">
                <h4>Auto Sync</h4>
                <p>Automatically sync configurations daily</p>
                <p className="info-cn">每天自动同步配置</p>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="sync-status">
            <h3>Sync History</h3>
            <div className="status-list">
              <div className="status-item">
                <span className="status-icon success">✓</span>
                <div className="status-info">
                  <p>Configuration synced successfully</p>
                  <span className="status-time">2 minutes ago</span>
                </div>
              </div>
              <div className="status-item">
                <span className="status-icon success">✓</span>
                <div className="status-info">
                  <p>3 new models available</p>
                  <span className="status-time">1 hour ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudSync;
