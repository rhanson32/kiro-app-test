// Data models for the Data Table Manager application

export interface DataEntry {
  id: string;
  scada_tag: string;
  pi_tag: string;
  product_type: string;
  tag_type: string;
  aggregation_type: string;
  conversion_factor: number;
  ent_hid: number;
  is_active: boolean;
  is_deleted: boolean;
  create_user: string;
  create_date: Date;
  change_user: string;
  change_date: Date;
  test_site: string;
  api10: string;
  uom: string;
  meter_id: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  lastLogin: Date;
}

export interface CSVImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  importId: string;
  timestamp: Date;
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  errorMessage: string;
}

// Form data interface for creating/editing entries
export interface DataEntryFormData {
  scada_tag: string;
  pi_tag: string;
  product_type: string;
  tag_type: string;
  aggregation_type: string;
  conversion_factor: number;
  ent_hid: number;
  test_site: string;
  api10: string;
  uom: string;
  meter_id: string;
}

// Filter and search interfaces
export interface TableFilters {
  search: string;
  product_type?: string;
  tag_type?: string;
  aggregation_type?: string;
  is_active?: boolean;
  test_site?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: keyof DataEntry;
  sortOrder?: 'asc' | 'desc';
}