import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from 'react-oidc-context';

// OIDC Configuration for Cognito
const oidcConfig = {
  authority: `https://cognito-idp.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${process.env.REACT_APP_USER_POOL_ID}`,
  client_id: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
  redirect_uri: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000',
  response_type: 'code',
  scope: 'openid email profile',
  // Tell Cognito to use EntraID as the identity provider
  extraQueryParams: {
    identity_provider: 'EntraID'
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

