// Data service interface for Databricks integration

import axios, { AxiosInstance, AxiosError } from 'axios';
import { DataEntry, DataEntryFormData, CSVImportResult } from '../types/DataEntry';
import { PaginatedResponse, QueryOptions, DatabricksConfig, DatabricksQueryResult } from '../types/Api';

export interface IDataService {
  // CRUD operations
  getEntries(options?: QueryOptions): Promise<PaginatedResponse<DataEntry>>;
  getEntry(id: string): Promise<DataEntry>;
  createEntry(data: DataEntryFormData): Promise<DataEntry>;
  updateEntry(id: string, data: Partial<DataEntryFormData>): Promise<DataEntry>;
  deleteEntry(id: string): Promise<void>;
  
  // Bulk operations
  bulkImport(csvData: string): Promise<CSVImportResult>;
  bulkDelete(ids: string[]): Promise<void>;
  
  // Search and filter
  searchEntries(query: string, options?: QueryOptions): Promise<PaginatedResponse<DataEntry>>;
  filterEntries(filters: Record<string, any>, options?: QueryOptions): Promise<PaginatedResponse<DataEntry>>;
  
  // Connection management
  testConnection(): Promise<boolean>;
  reconnect(): Promise<void>;
}

export class DataService implements IDataService {
  private databricksConfig: DatabricksConfig;
  private isConnected: boolean = false;
  private axiosInstance: AxiosInstance | null = null;
  private tableName: string;

  constructor(config: DatabricksConfig) {
    this.databricksConfig = config;
    this.tableName = `${config.catalog}.${config.schema}.${config.table || 'data_entries'}`;
  }

  /**
   * Lazy initialization of axios instance
   */
  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      // Check if we should use Lambda proxy or direct connection
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      const useProxy = apiBaseUrl && apiBaseUrl !== 'http://localhost:3000/api';
      
      console.log('DataService Configuration:', {
        apiBaseUrl,
        useProxy,
        databricksHost: this.databricksConfig.serverHostname
      });
      
      if (useProxy) {
        // Use Lambda proxy
        console.log('✅ Using Lambda proxy at:', apiBaseUrl);
        this.axiosInstance = axios.create({
          baseURL: apiBaseUrl,
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      } else {
        // Direct connection (will fail due to CORS in browser)
        console.warn('⚠️ Using direct connection to Databricks (will fail due to CORS)');
        this.axiosInstance = axios.create({
          baseURL: `https://${this.databricksConfig.serverHostname}`,
          headers: {
            'Authorization': `Bearer ${this.databricksConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      }

      // Add response interceptor for error handling
      this.axiosInstance.interceptors.response.use(
        response => response,
        error => this.handleApiError(error)
      );
    }
    return this.axiosInstance;
  }

  /**
   * Handle API errors and provide meaningful error messages
   */
  private handleApiError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;
      
      if (status === 401) {
        throw new Error('Authentication failed. Please check your Databricks access token.');
      } else if (status === 403) {
        throw new Error('Access denied. You do not have permission to perform this operation.');
      } else if (status === 404) {
        throw new Error('Resource not found. Please check your Databricks configuration.');
      } else if (status >= 500) {
        throw new Error(`Databricks server error: ${message}`);
      } else {
        throw new Error(`API error: ${message}`);
      }
    } else if (error.request) {
      // Request made but no response received
      this.isConnected = false;
      throw new Error('Unable to connect to Databricks. Please check your network connection and configuration.');
    } else {
      // Error in request setup
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Execute SQL query against Databricks
   */
  private async executeQuery(sql: string, parameters?: Record<string, any>): Promise<DatabricksQueryResult> {
    try {
      const axiosInstance = this.getAxiosInstance();
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      const useProxy = apiBaseUrl && apiBaseUrl !== 'http://localhost:3000/api';
      
      console.log('Executing query:', { sql: sql.substring(0, 100), useProxy, apiBaseUrl });
      
      let response;
      
      if (useProxy) {
        // Use Lambda proxy
        console.log('📡 Sending request through Lambda proxy');
        response = await axiosInstance.post('/proxy', {
          path: '/api/2.0/sql/statements',
          method: 'POST',
          data: {
            statement: sql,
            warehouse_id: this.databricksConfig.httpPath.split('/').pop(),
            parameters: parameters,
            wait_timeout: '30s'
          }
        });
      } else {
        // Direct connection
        console.log('📡 Sending direct request to Databricks');
        response = await axiosInstance.post(
          `/api/2.0/sql/statements`,
          {
            statement: sql,
            warehouse_id: this.databricksConfig.httpPath.split('/').pop(),
            parameters: parameters,
            wait_timeout: '30s'
          }
        );
      }

      const statementId = response.data.statement_id;
      
      // Poll for results if statement is still executing
      let result = response.data;
      while (result.status?.state === 'PENDING' || result.status?.state === 'RUNNING') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        let statusResponse;
        if (useProxy) {
          statusResponse = await axiosInstance.post('/proxy', {
            path: `/api/2.0/sql/statements/${statementId}`,
            method: 'GET'
          });
        } else {
          statusResponse = await axiosInstance.get(
            `/api/2.0/sql/statements/${statementId}`
          );
        }
        result = statusResponse.data;
      }

      if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Query execution failed');
      }

      this.isConnected = true;

      return {
        columns: result.manifest?.schema?.columns || [],
        rows: result.result?.data_array || [],
        rowCount: result.result?.row_count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transform Databricks row data to DataEntry object
   */
  private transformRowToDataEntry(row: any[], columns: Array<{ name: string }>): DataEntry {
    const entry: any = {};
    columns.forEach((col, index) => {
      const value = row[index];
      // Convert date strings to Date objects
      if (col.name === 'create_date' || col.name === 'change_date') {
        entry[col.name] = value ? new Date(value) : new Date();
      } else {
        entry[col.name] = value;
      }
    });
    return entry as DataEntry;
  }

  async getEntries(options?: QueryOptions): Promise<PaginatedResponse<DataEntry>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const sortBy = options?.sortBy || 'create_date';
    const sortOrder = options?.sortOrder || 'desc';

    // Build WHERE clause for filters
    let whereClause = '';
    const params: Record<string, any> = {};

    if (options?.filters) {
      const filterConditions: string[] = [];
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          filterConditions.push(`${key} = :${key}`);
          params[key] = value;
        }
      });
      if (filterConditions.length > 0) {
        whereClause = 'WHERE ' + filterConditions.join(' AND ');
      }
    }

    if (options?.search) {
      const searchCondition = `(scada_tag LIKE :search OR pi_tag LIKE :search OR product_type LIKE :search)`;
      if (whereClause) {
        whereClause += ` AND ${searchCondition}`;
      } else {
        whereClause = `WHERE ${searchCondition}`;
      }
      params.search = `%${options.search}%`;
    }

    // Get all data (no pagination since we're loading everything)
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${pageSize}
    `;
    
    const result = await this.executeQuery(dataQuery, params);
    const data = result.rows.map(row => this.transformRowToDataEntry(row, result.columns));
    const total = data.length;

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async getEntry(id: string): Promise<DataEntry> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = :id AND is_deleted = false`;
    const result = await this.executeQuery(query, { id });
    
    if (result.rows.length === 0) {
      throw new Error(`Entry with id ${id} not found`);
    }

    return this.transformRowToDataEntry(result.rows[0], result.columns);
  }

  async createEntry(data: DataEntryFormData): Promise<DataEntry> {
    // Implementation will be added in task 6
    throw new Error('Entry creation implementation pending - will be implemented in task 6');
  }

  async updateEntry(id: string, data: Partial<DataEntryFormData>): Promise<DataEntry> {
    // Implementation will be added in task 6
    throw new Error('Entry update implementation pending - will be implemented in task 6');
  }

  async deleteEntry(id: string): Promise<void> {
    // Implementation will be added in task 7
    throw new Error('Entry deletion implementation pending - will be implemented in task 7');
  }

  async bulkImport(csvData: string): Promise<CSVImportResult> {
    // Implementation will be added in task 8
    throw new Error('Bulk import implementation pending - will be implemented in task 8');
  }

  async bulkDelete(ids: string[]): Promise<void> {
    // Implementation will be added in task 7
    throw new Error('Bulk delete implementation pending - will be implemented in task 7');
  }

  async searchEntries(query: string, options?: QueryOptions): Promise<PaginatedResponse<DataEntry>> {
    return this.getEntries({
      ...options,
      search: query
    });
  }

  async filterEntries(filters: Record<string, any>, options?: QueryOptions): Promise<PaginatedResponse<DataEntry>> {
    return this.getEntries({
      ...options,
      filters
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simple query to test connection
      const query = `SELECT 1 as test`;
      await this.executeQuery(query);
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async reconnect(): Promise<void> {
    this.isConnected = false;
    const connected = await this.testConnection();
    if (!connected) {
      throw new Error('Failed to reconnect to Databricks');
    }
  }
}

// Factory function to create DataService instance (lazy initialization)
export function createDataService(): DataService {
  return new DataService({
    serverHostname: process.env.REACT_APP_DATABRICKS_HOSTNAME || '',
    httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
    accessToken: process.env.REACT_APP_DATABRICKS_TOKEN || '',
    catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
    schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
    table: process.env.REACT_APP_DATABRICKS_TABLE || 'data_entries'
  });
}

// Export singleton instance - will be created on first use
let dataServiceInstance: DataService | null = null;

export function getDataService(): DataService {
  if (!dataServiceInstance) {
    dataServiceInstance = createDataService();
  }
  return dataServiceInstance;
}

// For backward compatibility
export const dataService = {
  get instance() {
    return getDataService();
  }
};
