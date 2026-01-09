// Authentication configuration for Entra ID integration
export const authConfig = {
  // Entra ID (Azure AD) configuration
  entraId: {
    clientId: process.env.REACT_APP_ENTRA_CLIENT_ID || '',
    authority: process.env.REACT_APP_ENTRA_AUTHORITY || '',
    redirectUri: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000',
    scopes: ['openid', 'profile', 'email', 'User.Read']
  },
  
  // AWS Amplify Auth configuration
  amplify: {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || '',
    oauth: {
      domain: process.env.REACT_APP_OAUTH_DOMAIN || '',
      scope: ['phone', 'email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
      redirectSignIn: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/',
      redirectSignOut: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/',
      responseType: 'code'
    }
  }
};

export default authConfig;