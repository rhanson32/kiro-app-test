// API and service-related type definitions

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  search?: string;
}

// Databricks connection types
export interface DatabricksConfig {
  serverHostname: string;
  httpPath: string;
  accessToken: string;
  catalog?: string;
  schema?: string;
}

export interface DatabricksQueryResult {
  columns: Array<{
    name: string;
    type: string;
  }>;
  rows: any[][];
  rowCount: number;
}

export interface SqlExecutionRequest {
  query: string;
  parameters?: Record<string, any>;
}

// File upload types
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  message?: string;
  errors?: string[];
}