// Authentication configuration for Entra ID integration with AWS Amplify
import { ResourcesConfig } from 'aws-amplify';

export const authConfig = {
  // Entra ID (Azure AD) configuration
  entraId: {
    clientId: process.env.REACT_APP_ENTRA_CLIENT_ID || '',
    authority: process.env.REACT_APP_ENTRA_AUTHORITY || '',
    redirectUri: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000',
    scopes: ['openid', 'profile', 'email', 'User.Read']
  }
};

// AWS Amplify configuration with Entra ID integration
export const getAmplifyConfig = (): ResourcesConfig => {
  return {
    Auth: {
      Cognito: {
        userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
        userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
        identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || '',
        loginWith: {
          oauth: {
            domain: process.env.REACT_APP_OAUTH_DOMAIN || '',
            scopes: [
              'phone',
              'email',
              'openid',
              'profile',
              'aws.cognito.signin.user.admin'
            ],
            redirectSignIn: [
              process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/'
            ],
            redirectSignOut: [
              process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/'
            ],
            responseType: 'code',
            providers: [
              {
                custom: 'EntraID'
              }
            ]
          },
          email: true
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true
          }
        },
        allowGuestAccess: false,
        mfa: {
          status: 'off',
          smsEnabled: false,
          totpEnabled: false
        },
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: false
        }
      }
    }
  };
};

export default authConfig;