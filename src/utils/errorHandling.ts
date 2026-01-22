// Error handling utilities

import { ApiError } from '../types/Api';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  DATABRICKS = 'DATABRICKS',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

// Error factory functions
export const createNetworkError = (message: string, details?: any): AppError => ({
  type: ErrorType.NETWORK,
  message,
  details,
  timestamp: new Date()
});

export const createAuthError = (message: string, code?: string): AppError => ({
  type: ErrorType.AUTHENTICATION,
  message,
  code,
  timestamp: new Date()
});

export const createValidationError = (message: string, details?: any): AppError => ({
  type: ErrorType.VALIDATION,
  message,
  details,
  timestamp: new Date()
});

export const createServerError = (message: string, code?: string, details?: any): AppError => ({
  type: ErrorType.SERVER,
  message,
  code,
  details,
  timestamp: new Date()
});

export const createDatabricksError = (message: string, details?: any): AppError => ({
  type: ErrorType.DATABRICKS,
  message,
  details,
  timestamp: new Date()
});

// Error parsing utilities
export const parseApiError = (error: any): AppError => {
  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 401) {
      return createAuthError('Authentication required', 'UNAUTHORIZED');
    } else if (status === 403) {
      return createAuthError('Access denied', 'FORBIDDEN');
    } else if (status >= 400 && status < 500) {
      return createValidationError(data?.message || 'Invalid request', data);
    } else if (status >= 500) {
      return createServerError(data?.message || 'Server error', status.toString(), data);
    }
  } else if (error.request) {
    // Network error
    return createNetworkError('Network connection failed', error.request);
  }
  
  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'An unexpected error occurred',
    details: error,
    timestamp: new Date()
  };
};

// User-friendly error messages
export const getErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Authentication failed. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.';
    case ErrorType.SERVER:
      return 'A server error occurred. Please try again later.';
    case ErrorType.DATABRICKS:
      return 'Database connection error. Please try again or contact support.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// Error logging utility
export const logError = (error: AppError, context?: string): void => {
  const logData = {
    ...error,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', logData);
  }
  
  // In production, send to logging service
  // This will be implemented when error reporting is set up
};

// Retry utility for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};