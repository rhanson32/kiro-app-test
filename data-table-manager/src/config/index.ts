// Central configuration management

import authConfig from './auth';

// Application configuration
export const appConfig = {
  // Environment
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  logLevel: process.env.REACT_APP_LOG_LEVEL || 'info',
  
  // API configuration
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  },
  
  // Feature flags
  features: {
    csvUpload: process.env.REACT_APP_ENABLE_CSV_UPLOAD === 'true',
    bulkOperations: process.env.REACT_APP_ENABLE_BULK_OPERATIONS === 'true'
  },
  
  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE || '10485760'), // 10MB default
    allowedTypes: ['text/csv', 'application/csv'],
    chunkSize: 1024 * 1024 // 1MB chunks
  },
  
  // Pagination configuration
  pagination: {
    defaultPageSize: parseInt(process.env.REACT_APP_PAGE_SIZE || '50'),
    pageSizeOptions: [25, 50, 100, 200]
  },
  
  // Databricks configuration
  databricks: {
    serverHostname: process.env.REACT_APP_DATABRICKS_HOSTNAME || '',
    httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
    accessToken: process.env.REACT_APP_DATABRICKS_TOKEN || '',
    catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
    schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
    connectionTimeout: 10000, // 10 seconds
    queryTimeout: 60000 // 60 seconds
  }
};

// Export all configurations
export { authConfig };
export default appConfig;