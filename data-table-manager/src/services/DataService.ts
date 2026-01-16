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
  
  // Lookup operations
  lookupEntHidFromTplnr(tplnrValues: string[]): Promise<Map<string, number>>;
  getTagTypes(): Promise<string[]>;
  getAggregationTypes(): Promise<string[]>;
  addTagType(tagType: string): Promise<void>;
  addAggregationType(aggregationType: string): Promise<void>;
  
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
            wait_timeout: '50s'
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
            wait_timeout: '50s'
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

      // Return only the first chunk of data (we use OFFSET/LIMIT for pagination)
      const rows = result.result?.data_array || [];
      console.log(`Query returned ${rows.length} rows`);

      return {
        columns: result.manifest?.schema?.columns || [],
        rows: rows,
        rowCount: rows.length
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

    // Fetch data in batches to avoid Lambda 6MB payload limit
    // Each batch will be ~20k records which should be well under the limit
    const batchSize = 20000;
    let allData: DataEntry[] = [];
    let offset = 0;
    let hasMore = true;

    console.log('Fetching entries in batches of 20k...');

    while (hasMore) {
      const dataQuery = `
        SELECT pi_tag, scada_tag, product_type, tag_type, aggregation_type, ent_hid, entname, tplnr, asset_team, is_active, id
        FROM ${this.tableName}
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} is_active = true AND is_deleted = false
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ${batchSize} OFFSET ${offset}
      `;
      
      console.log(`Fetching batch at offset ${offset}...`);
      const result = await this.executeQuery(dataQuery, params);
      const batchData = result.rows.map(row => this.transformRowToDataEntry(row, result.columns));
      
      console.log(`Fetched ${batchData.length} rows in this batch`);
      
      if (batchData.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(batchData);
        offset += batchSize;
        
        // If we got fewer rows than batch size, we've reached the end
        if (batchData.length < batchSize) {
          hasMore = false;
        }
      }
    }

    console.log(`✅ Total rows fetched: ${allData.length}`);
    const total = allData.length;

    return {
      data: allData,
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
    
    // Remove tplnr from data as it doesn't exist in base table (only in view via join)
    const { tplnr, ...dataWithoutTplnr } = data;
    
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
      ...dataWithoutTplnr,
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
    
    // Remove tplnr from data as it doesn't exist in base table (only in view via join)
    const { tplnr, ...dataWithoutTplnr } = data;
    
    // Build SET clause dynamically based on provided fields
    const setFields: string[] = [];
    const params: Record<string, any> = { id, change_date: now, user };
    
    Object.entries(dataWithoutTplnr).forEach(([key, value]) => {
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
      // Trim tplnr values to handle hidden spaces (including tabs, newlines, etc.)
      const trimmedTplnrValues = tplnrValues.map(t => t.replace(/\s+/g, ' ').trim());
      const tplnrList = trimmedTplnrValues.map(t => `'${t}'`).join(',');
      const lookupQuery = `
        SELECT TRIM(REGEXP_REPLACE(entcode, '\\\\s+', ' ')) as tplnr, EntHID
        FROM operations.fdc.vw_cfentity
        WHERE TRIM(REGEXP_REPLACE(entcode, '\\\\s+', ' ')) IN (${tplnrList})
      `;
      
      console.log('Executing tplnr lookup query:', lookupQuery.substring(0, 200));
      const lookupResult = await this.executeQuery(lookupQuery);
      console.log(`Lookup found ${lookupResult.rows.length} matches out of ${tplnrValues.length} tplnr values`);
      
      lookupResult.rows.forEach(row => {
        const tplnr = row[0];
        const ent_hid = row[1];
        if (tplnr && ent_hid) {
          // Normalize whitespace and trim
          const normalizedTplnr = String(tplnr).replace(/\s+/g, ' ').trim();
          tplnrToEntHidMap.set(normalizedTplnr, ent_hid);
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

  async getTagTypes(): Promise<string[]> {
    try {
      // Use base catalog/schema for tag types lookup
      const baseCatalog = process.env.REACT_APP_DATABRICKS_BASE_CATALOG || this.databricksConfig.catalog;
      const tagTypesQuery = `
        SELECT DISTINCT tag_type
        FROM ${baseCatalog}.xref.xref_tag_types
        ORDER BY tag_type
      `;
      
      console.log('Fetching tag types from:', `${baseCatalog}.xref.xref_tag_types`);
      const result = await this.executeQuery(tagTypesQuery);
      
      const tagTypes = result.rows.map(row => row[0]).filter(Boolean);
      console.log(`Found ${tagTypes.length} tag types`);
      
      return tagTypes;
    } catch (error) {
      console.error('Error fetching tag types:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Return empty array on error so form still works
      return [];
    }
  }

  async getAggregationTypes(): Promise<string[]> {
    try {
      // Use base catalog/schema for aggregation types lookup
      const baseCatalog = process.env.REACT_APP_DATABRICKS_BASE_CATALOG || this.databricksConfig.catalog;
      const aggregationTypesQuery = `
        SELECT DISTINCT aggregation_type
        FROM ${baseCatalog}.xref.xref_aggregation_types
        ORDER BY aggregation_type
      `;
      
      console.log('Fetching aggregation types from:', `${baseCatalog}.xref.xref_aggregation_types`);
      const result = await this.executeQuery(aggregationTypesQuery);
      
      const aggregationTypes = result.rows.map(row => row[0]).filter(Boolean);
      console.log(`Found ${aggregationTypes.length} aggregation types`);
      
      return aggregationTypes;
    } catch (error) {
      console.error('Error fetching aggregation types:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Return empty array on error so form still works
      return [];
    }
  }

  async addTagType(tagType: string): Promise<void> {
    try {
      const baseCatalog = process.env.REACT_APP_DATABRICKS_BASE_CATALOG || this.databricksConfig.catalog;
      const insertQuery = `
        INSERT INTO ${baseCatalog}.xref.xref_tag_types (tag_type)
        VALUES ('${tagType.replace(/'/g, "''")}')
      `;
      
      console.log('Adding tag type:', tagType);
      await this.executeQuery(insertQuery);
      console.log('Tag type added successfully');
    } catch (error) {
      console.error('Error adding tag type:', error);
      throw new Error(`Failed to add tag type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addAggregationType(aggregationType: string): Promise<void> {
    try {
      const baseCatalog = process.env.REACT_APP_DATABRICKS_BASE_CATALOG || this.databricksConfig.catalog;
      const insertQuery = `
        INSERT INTO ${baseCatalog}.xref.xref_aggregation_types (aggregation_type)
        VALUES ('${aggregationType.replace(/'/g, "''")}')
      `;
      
      console.log('Adding aggregation type:', aggregationType);
      await this.executeQuery(insertQuery);
      console.log('Aggregation type added successfully');
    } catch (error) {
      console.error('Error adding aggregation type:', error);
      throw new Error(`Failed to add aggregation type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        // Normalize whitespace: replace multiple spaces/tabs with single space
        const normalizedTplnr = values[tplnrIndex].replace(/\s+/g, ' ').trim();
        tplnrValues.add(normalizedTplnr);
      }
    }

    // Lookup ent_hid values for all tplnr values in one query
    const tplnrToEntHidMap = new Map<string, number>();
    if (tplnrValues.size > 0) {
      try {
        const tplnrList = Array.from(tplnrValues).map(t => `'${t}'`).join(',');
        const lookupQuery = `
          SELECT TRIM(REGEXP_REPLACE(entcode, '\\\\s+', ' ')) as tplnr, EntHID
          FROM operations.fdc.vw_cfentity
          WHERE TRIM(REGEXP_REPLACE(entcode, '\\\\s+', ' ')) IN (${tplnrList})
        `;
        const lookupResult = await this.executeQuery(lookupQuery);
        
        lookupResult.rows.forEach(row => {
          const tplnr = row[0];
          const ent_hid = row[1];
          if (tplnr && ent_hid) {
            // Normalize whitespace and trim
            const normalizedTplnr = String(tplnr).replace(/\s+/g, ' ').trim();
            tplnrToEntHidMap.set(normalizedTplnr, ent_hid);
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
          // Normalize whitespace: replace multiple spaces/tabs with single space, then trim
          const normalizedTplnr = row.tplnr.replace(/\s+/g, ' ').trim();
          const lookedUpEntHid = tplnrToEntHidMap.get(normalizedTplnr);
          if (lookedUpEntHid) {
            row.ent_hid = lookedUpEntHid;
          } else {
            throw new Error(`No ent_hid found for tplnr: ${normalizedTplnr}`);
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
