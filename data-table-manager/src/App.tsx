import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import amplifyconfig from './amplifyconfiguration.json';
import { appConfig } from './config';
import './App.css';

// Configure Amplify with enhanced configuration
const configureAmplify = () => {
  try {
    // Merge Amplify config with environment variables
    const enhancedConfig = {
      ...amplifyconfig,
      aws_user_pools_id: process.env.REACT_APP_USER_POOL_ID || amplifyconfig.aws_user_pools_id,
      aws_user_pools_web_client_id: process.env.REACT_APP_USER_POOL_CLIENT_ID || amplifyconfig.aws_user_pools_web_client_id,
      aws_cognito_identity_pool_id: process.env.REACT_APP_IDENTITY_POOL_ID || amplifyconfig.aws_cognito_identity_pool_id,
      oauth: {
        ...amplifyconfig.oauth,
        domain: process.env.REACT_APP_OAUTH_DOMAIN || amplifyconfig.oauth.domain,
        redirectSignIn: process.env.REACT_APP_REDIRECT_URI || amplifyconfig.oauth.redirectSignIn,
        redirectSignOut: process.env.REACT_APP_REDIRECT_URI || amplifyconfig.oauth.redirectSignOut
      }
    };

    Amplify.configure(enhancedConfig);
    
    if (appConfig.environment === 'development') {
      console.log('Amplify configured successfully');
      console.log('Environment:', appConfig.environment);
      console.log('Features enabled:', appConfig.features);
    }
  } catch (error) {
    console.error('Failed to configure Amplify:', error);
  }
};

// Initialize Amplify
configureAmplify();

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="App-header">
            <h1>Data Table Manager</h1>
            <div className="user-info">
              <p>Welcome, {user?.signInDetails?.loginId || user?.username}!</p>
              <button onClick={signOut} className="sign-out-btn">
                Sign out
              </button>
            </div>
          </header>
          <main className="main-content">
            <div className="status-panel">
              <h2>System Status</h2>
              <div className="status-item">
                <span className="status-label">Authentication:</span>
                <span className="status-value success">✓ Connected</span>
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
              <h2>Next Steps</h2>
              <p>The Data Table Manager foundation is now set up with:</p>
              <ul>
                <li>✓ React TypeScript application structure</li>
                <li>✓ AWS Amplify configuration with Entra ID support</li>
                <li>✓ Core type definitions and interfaces</li>
                <li>✓ Service layer architecture</li>
                <li>✓ Utility functions for validation and formatting</li>
                <li>✓ Error handling framework</li>
                <li>✓ Configuration management</li>
              </ul>
              <p>Ready to implement authentication system (Task 2).</p>
            </div>
          </main>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
