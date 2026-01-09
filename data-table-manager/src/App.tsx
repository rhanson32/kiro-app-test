import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { getAmplifyConfig } from './config/auth';
import { appConfig } from './config';
import { UserProfile } from './components';
import { signInWithRedirect, getCurrentUser } from 'aws-amplify/auth';
import type { AuthUser } from 'aws-amplify/auth';
import './App.css';

// Configure Amplify with Entra ID integration
const configureAmplify = () => {
  try {
    const amplifyConfig = getAmplifyConfig();
    Amplify.configure(amplifyConfig);
    
    if (appConfig.environment === 'development') {
      console.log('Amplify configured successfully with Entra ID integration');
      console.log('Environment:', appConfig.environment);
      console.log('Features enabled:', appConfig.features);
    }
  } catch (error) {
    console.error('Failed to configure Amplify:', error);
  }
};

// Initialize Amplify
configureAmplify();

// Custom SSO Login Component
const SSOLogin: React.FC = () => {
  const handleSSOLogin = async () => {
    try {
      await signInWithRedirect({
        provider: { custom: 'EntraID' }
      });
    } catch (error) {
      console.error('SSO login failed:', error);
    }
  };

  return (
    <div className="sso-login-container">
      <div className="sso-login-card">
        <h1>XREF Manager</h1>
        <p className="sso-subtitle">Sign in with your organizational account</p>
        <button 
          className="sso-button"
          onClick={handleSSOLogin}
        >
          Login through SSO
        </button>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // User not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import('aws-amplify/auth');
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="sso-login-container">
        <div className="sso-login-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, show custom SSO login
  if (!user) {
    return <SSOLogin />;
  }

  // Show main app when authenticated
  return (
    <div className="App">
      <header className="App-header">
        <h1>XREF Manager</h1>
        <UserProfile onLogout={handleSignOut} />
      </header>
      <main className="main-content">
        <div className="status-panel">
          <h2>System Status</h2>
          <div className="status-item">
            <span className="status-label">Authentication:</span>
            <span className="status-value success">✓ Connected</span>
          </div>
          <div className="status-item">
            <span className="status-label">User:</span>
            <span className="status-value">{user?.signInDetails?.loginId || user?.username}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Environment:</span>
            <span className="status-value">{appConfig.environment}</span>
          </div>
          <div className="status-item">
            <span className="status-label">CSV Upload:</span>
            <span className={`status-value ${appConfig.features.csvUpload ? 'success' : 'disabled'}`}>
              {appConfig.features.csvUpload ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Bulk Operations:</span>
            <span className={`status-value ${appConfig.features.bulkOperations ? 'success' : 'disabled'}`}>
              {appConfig.features.bulkOperations ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
        </div>
        <div className="info-panel">
          <h2>Authentication System Implemented</h2>
          <p>The authentication system is now fully configured with:</p>
          <ul>
            <li>✓ Entra ID integration with AWS Amplify</li>
            <li>✓ OAuth 2.0 authentication flow</li>
            <li>✓ Session management service</li>
            <li>✓ Login and logout components</li>
            <li>✓ Protected route wrapper</li>
            <li>✓ User profile display</li>
          </ul>
          <p>Ready to implement Databricks connection (Task 3).</p>
        </div>
      </main>
    </div>
  );
}

export default App;

