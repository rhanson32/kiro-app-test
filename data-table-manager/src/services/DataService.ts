// Data service interface for Databricks integration

import axios, { AxiosInstance, AxiosError } from 'axios';
import { DataEntry, DataEntryFormData, CSVImportResult } from '../types/DataEntry';
import { PaginatedResponse, QueryOptions, DatabricksConfig, DatabricksQueryResult } from '../types/Api';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface IDataService {
  // CRUD operations
  getEntries(options?: QueryOptions): Promise<PaginatedResponse<DataEntry>>;
  getEntry(id: string): Promise<DataEntry>;
  createEntry(data: DataEntryFormData, userEmail?: string): Promise<DataEntry>;
  updateEntry(id: string, data: Partial<DataEntryFormData>, userEmail?: string): Promise<DataEntry>;
  deleteEntry(id: string, userEmail?: string): Promise<void>;
  toggleActive(id: string, isActive: boolean, userEmail?: string): Promise<void>;
  
  // Bulk operations
  bulkImport(csvData: string, userEmail?: string): Promise<CSVImportResult>;
  bulkDelete(ids: string[], userEmail?: string): Promise<void>;
  
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
  private baseTableName: string;

  constructor(config: DatabricksConfig) {
    this.databricksConfig = config;
    this.tableName = `${config.catalog}.${config.schema}.${config.table || 'data_entries'}`;
    // Base table for write operations (INSERT, UPDATE, DELETE)
    const baseCatalog = process.env.REACT_APP_DATABRICKS_BASE_CATALOG || config.catalog;
    const baseSchema = process.env.REACT_APP_DATABRICKS_BASE_SCHEMA || config.schema;
    const baseTable = process.env.REACT_APP_DATABRICKS_BASE_TABLE || config.table || 'data_entries';
    this.baseTableName = `${baseCatalog}.${baseSchema}.${baseTable}`;
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

    // Get only the specific columns we need
    const dataQuery = `
      SELECT pi_tag, scada_tag, product_type, tag_type, aggregation_type, ent_hid, entname, tplnr, asset_team, is_active, id
      FROM ${this.tableName}
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

  async createEntry(data: DataEntryFormData, userEmail?: string): Promise<DataEntry> {
    const now = new Date().toISOString();
    const id = generateUUID();
    const user = userEmail || 'system';
    
    const insertQuery = `
      INSERT INTO ${this.baseTableName} (
        id, scada_tag, pi_tag, product_type, tag_type, aggregation_type,
        conversion_factor, ent_hid, test_site, api10, uom, meter_id,
        is_active, is_deleted, create_user, create_date, change_user, change_date
      ) VALUES (
        :id, :scada_tag, :pi_tag, :product_type, :tag_type, :aggregation_type,
        :conversion_factor, :ent_hid, :test_site, :api10, :uom, :meter_id,
        true, false, :user, :create_date, :user, :change_date
      )
    `;
    
    const params = {
      id,
      ...data,
      user,
      create_date: now,
      change_date: now
    };
    
    await this.executeQuery(insertQuery, params);
    
    // Fetch and return the created entry
    return this.getEntry(id);
  }

  async updateEntry(id: string, data: Partial<DataEntryFormData>, userEmail?: string): Promise<DataEntry> {
    const now = new Date().toISOString();
    const user = userEmail || 'system';
    
    // Build SET clause dynamically based on provided fields
    const setFields: string[] = [];
    const params: Record<string, any> = { id, change_date: now, user };
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields.push(`${key} = :${key}`);
        params[key] = value;
      }
    });
    
    if (setFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    setFields.push('change_date = :change_date');
    setFields.push('change_user = :user');
    
    const updateQuery = `
      UPDATE ${this.baseTableName}
      SET ${setFields.join(', ')}
      WHERE id = :id
    `;
    
    await this.executeQuery(updateQuery, params);
    
    // Fetch and return the updated entry
    return this.getEntry(id);
  }

  async deleteEntry(id: string, userEmail?: string): Promise<void> {
    const now = new Date().toISOString();
    const user = userEmail || 'system';
    
    // Soft delete - mark as deleted instead of removing from database
    const deleteQuery = `
      UPDATE ${this.baseTableName}
      SET is_deleted = true,
          change_date = :change_date,
          change_user = :user
      WHERE id = :id
    `;
    
    const params = {
      id,
      change_date: now,
      user
    };
    
    await this.executeQuery(deleteQuery, params);
  }

  async toggleActive(id: string, isActive: boolean, userEmail?: string): Promise<void> {
    const now = new Date().toISOString();
    const user = userEmail || 'system';
    
    // Toggle is_active status
    const updateQuery = `
      UPDATE ${this.baseTableName}
      SET is_active = :is_active,
          change_date = :change_date,
          change_user = :user
      WHERE id = :id
    `;
    
    const params = {
      id,
      is_active: isActive,
      change_date: now,
      user
    };
    
    await this.executeQuery(updateQuery, params);
  }

  async lookupEntHidFromTplnr(tplnrValues: string[]): Promise<Map<string, number>> {
    const tplnrToEntHidMap = new Map<string, number>();
    
    if (tplnrValues.length === 0) {
      return tplnrToEntHidMap;
    }

    try {
      // Trim tplnr values to handle hidden spaces
      const trimmedTplnrValues = tplnrValues.map(t => t.trim());
      const tplnrList = trimmedTplnrValues.map(t => `'${t}'`).join(',');
      const lookupQuery = `
        SELECT TRIM(entcode) as tplnr, EntHID
        FROM operations.fdc.vw_cfentity
        WHERE TRIM(entcode) IN (${tplnrList})
      `;
      
      console.log('Executing tplnr lookup query:', lookupQuery);
      const lookupResult = await this.executeQuery(lookupQuery);
      console.log(`Lookup found ${lookupResult.rows.length} matches out of ${tplnrValues.length} tplnr values`);
      
      lookupResult.rows.forEach(row => {
        const tplnr = row[0];
        const ent_hid = row[1];
        if (tplnr && ent_hid) {
          tplnrToEntHidMap.set(tplnr.trim(), ent_hid);
        }
      });
      
      // Log which tplnr values were not found
      const notFound = trimmedTplnrValues.filter(t => !tplnrToEntHidMap.has(t));
      if (notFound.length > 0) {
        console.warn(`No ent_hid found for ${notFound.length} tplnr values:`, notFound);
      }
    } catch (error) {
      console.error('Error looking up ent_hid values:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      throw new Error(`Failed to lookup entity IDs from tplnr values: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return tplnrToEntHidMap;
  }

  async bulkImport(csvData: string, userEmail?: string): Promise<CSVImportResult> {
    const now = new Date().toISOString();
    const importId = `import-${Date.now()}`;
    const user = userEmail || 'system';
    
    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV data is empty');
    }

    const totalRows = lines.length - 1; // Exclude header
    const errors: any[] = [];

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Build a map of tplnr -> ent_hid by querying the lookup table once
    const tplnrValues = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const tplnrIndex = header.indexOf('tplnr');
      if (tplnrIndex >= 0 && values[tplnrIndex]) {
        tplnrValues.add(values[tplnrIndex]);
      }
    }

    // Lookup ent_hid values for all tplnr values in one query
    const tplnrToEntHidMap = new Map<string, number>();
    if (tplnrValues.size > 0) {
      try {
        const tplnrList = Array.from(tplnrValues).map(t => `'${t.trim()}'`).join(',');
        const lookupQuery = `
          SELECT TRIM(entcode) as tplnr, EntHID
          FROM operations.fdc.vw_cfentity
          WHERE TRIM(entcode) IN (${tplnrList})
        `;
        const lookupResult = await this.executeQuery(lookupQuery);
        
        lookupResult.rows.forEach(row => {
          const tplnr = row[0];
          const ent_hid = row[1];
          if (tplnr && ent_hid) {
            tplnrToEntHidMap.set(tplnr.trim(), ent_hid);
          }
        });
      } catch (error) {
        console.error('Error looking up ent_hid values:', error);
        throw new Error('Failed to lookup entity IDs from tplnr values');
      }
    }

    // PHASE 1: Validate all rows first (no database writes)
    const validatedRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        header.forEach((col, index) => {
          const value = values[index];
          if (col === 'conversion_factor') {
            row[col] = parseFloat(value) || 0;
          } else {
            row[col] = value;
          }
        });

        // Always lookup ent_hid from tplnr
        if (row.tplnr) {
          const trimmedTplnr = row.tplnr.trim();
          const lookedUpEntHid = tplnrToEntHidMap.get(trimmedTplnr);
          if (lookedUpEntHid) {
            row.ent_hid = lookedUpEntHid;
          } else {
            throw new Error(`No ent_hid found for tplnr: ${trimmedTplnr}`);
          }
        } else {
          throw new Error('tplnr is required');
        }

        // Validate required fields
        if (!row.ent_hid) {
          throw new Error('ent_hid could not be determined from tplnr');
        }

        // Validate required columns
        if (!row.scada_tag) throw new Error('scada_tag is required');
        if (!row.pi_tag) throw new Error('pi_tag is required');
        if (!row.product_type) throw new Error('product_type is required');
        if (!row.tag_type) throw new Error('tag_type is required');
        if (!row.aggregation_type) throw new Error('aggregation_type is required');

        validatedRows.push(row);
      } catch (error) {
        errors.push({
          row: i,
          field: 'general',
          value: lines[i],
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If ANY validation errors, fail the entire import
    if (errors.length > 0) {
      return {
        totalRows,
        successfulImports: 0,
        failedImports: errors.length,
        errors,
        importId,
        timestamp: new Date()
      };
    }

    // PHASE 2: All rows are valid, insert them all in a single multi-row INSERT
    try {
      // Build VALUES clauses for all rows
      const valuesClauses: string[] = [];
      
      for (const row of validatedRows) {
        const id = generateUUID();
        
        // Escape single quotes in string values
        const escapeValue = (val: any) => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        };
        
        const valuesClause = `(
          ${escapeValue(id)},
          ${escapeValue(row.scada_tag || '')},
          ${escapeValue(row.pi_tag || '')},
          ${escapeValue(row.product_type || '')},
          ${escapeValue(row.tag_type || '')},
          ${escapeValue(row.aggregation_type || '')},
          ${row.conversion_factor || 1},
          ${row.ent_hid},
          ${escapeValue(row.test_site || '')},
          ${escapeValue(row.api10 || '')},
          ${escapeValue(row.uom || '')},
          ${escapeValue(row.meter_id || '')},
          true,
          false,
          ${escapeValue(user)},
          ${escapeValue(now)},
          ${escapeValue(user)},
          ${escapeValue(now)}
        )`;
        
        valuesClauses.push(valuesClause);
      }
      
      // Create single multi-row INSERT statement
      const insertQuery = `
        INSERT INTO ${this.baseTableName} (
          id, scada_tag, pi_tag, product_type, tag_type, aggregation_type,
          conversion_factor, ent_hid, test_site, api10, uom, meter_id,
          is_active, is_deleted, create_user, create_date, change_user, change_date
        ) VALUES
        ${valuesClauses.join(',\n')}
      `;

      await this.executeQuery(insertQuery);

      return {
        totalRows,
        successfulImports: validatedRows.length,
        failedImports: 0,
        errors: [],
        importId,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}.`);
    }
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
