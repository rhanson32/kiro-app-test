// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Amplify configuration for tests
jest.mock('./amplifyconfiguration.json', () => ({
  aws_project_region: 'us-east-1',
  aws_cognito_identity_pool_id: 'test-pool-id',
  aws_cognito_region: 'us-east-1',
  aws_user_pools_id: 'test-user-pool-id',
  aws_user_pools_web_client_id: 'test-client-id',
  oauth: {
    domain: 'test-domain',
    scope: ['openid', 'profile', 'email'],
    redirectSignIn: 'http://localhost:3000/',
    redirectSignOut: 'http://localhost:3000/',
    responseType: 'code'
  }
}));

// Mock environment variables for tests
process.env.REACT_APP_ENVIRONMENT = 'test';
process.env.REACT_APP_ENABLE_CSV_UPLOAD = 'true';
process.env.REACT_APP_ENABLE_BULK_OPERATIONS = 'true';