// Data service interface for Databricks integration

import { DataEntry, DataEntryFormData, CSVImportResult } from '../types/DataEntry';
import { ApiResponse, PaginatedResponse, QueryOptions, DatabricksConfig } from '../types/Api';

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

  constructor(config: DatabricksConfig) {
    this.databricksConfig = config;
  }

  async getEntries(options?: QueryOptions): Promise<PaginatedResponse<DataEntry>> {
    // Implementation will be added in task 3
    throw new Error('Data retrieval implementation pending - will be implemented in task 3');
  }

  async getEntry(id: string): Promise<DataEntry> {
    // Implementation will be added in task 3
    throw new Error('Single entry retrieval implementation pending - will be implemented in task 3');
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
    // Implementation will be added in task 5
    throw new Error('Search implementation pending - will be implemented in task 5');
  }

  async filterEntries(filters: Record<string, any>, options?: QueryOptions): Promise<PaginatedResponse<DataEntry>> {
    // Implementation will be added in task 5
    throw new Error('Filter implementation pending - will be implemented in task 5');
  }

  async testConnection(): Promise<boolean> {
    // Implementation will be added in task 3
    return false;
  }

  async reconnect(): Promise<void> {
    // Implementation will be added in task 3
    this.isConnected = false;
  }
}

// Export singleton instance (will be configured in task 3)
export const dataService = new DataService({
  serverHostname: process.env.REACT_APP_DATABRICKS_HOSTNAME || '',
  httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
  accessToken: process.env.REACT_APP_DATABRICKS_TOKEN || '',
  catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
  schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default'
});
