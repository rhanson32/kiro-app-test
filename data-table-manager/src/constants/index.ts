// Application constants

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile'
  },
  DATA: {
    ENTRIES: '/data/entries',
    ENTRY: (id: string) => `/data/entries/${id}`,
    SEARCH: '/data/entries/search',
    BULK_IMPORT: '/data/entries/bulk-import',
    BULK_DELETE: '/data/entries/bulk-delete'
  },
  DATABRICKS: {
    TEST_CONNECTION: '/databricks/test',
    EXECUTE_QUERY: '/databricks/query'
  }
};

// Table configuration
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [25, 50, 100, 200],
  MAX_ROWS_PER_PAGE: 500,
  SORT_DIRECTIONS: ['asc', 'desc'] as const
};

// Form validation constants
export const VALIDATION_RULES = {
  SCADA_TAG: {
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  PI_TAG: {
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  PRODUCT_TYPE: {
    MAX_LENGTH: 50,
    REQUIRED: true
  },
  TAG_TYPE: {
    MAX_LENGTH: 50,
    REQUIRED: true
  },
  AGGREGATION_TYPE: {
    MAX_LENGTH: 50,
    REQUIRED: true
  },
  CONVERSION_FACTOR: {
    MIN_VALUE: 0,
    MAX_VALUE: 999999.9999,
    DECIMAL_PLACES: 4
  },
  ENT_HID: {
    MIN_VALUE: 0,
    MAX_VALUE: 2147483647
  }
};

// File upload constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['text/csv', 'application/csv'],
  CHUNK_SIZE: 1024 * 1024, // 1MB
  MAX_ROWS: 10000
};

// CSV configuration
export const CSV_CONFIG = {
  DELIMITER: ',',
  QUOTE_CHAR: '"',
  ESCAPE_CHAR: '"',
  HEADERS: [
    'scada_tag',
    'pi_tag',
    'product_type',
    'tag_type',
    'aggregation_type',
    'conversion_factor',
    'ent_hid',
    'test_site',
    'api10',
    'uom',
    'meter_id'
  ]
};

// UI constants
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300, // ms
  TOAST_DURATION: 5000, // ms
  MODAL_ANIMATION_DURATION: 200, // ms
  LOADING_DELAY: 500, // ms before showing loading spinner
  RETRY_DELAY: 1000 // ms between retry attempts
};

// Status values
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted'
} as const;

// Error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABRICKS_ERROR: 'DATABRICKS_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  CSV_PARSE_ERROR: 'CSV_PARSE_ERROR'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  TABLE_FILTERS: 'table_filters',
  COLUMN_WIDTHS: 'column_widths'
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  DATA_TABLE: '/data',
  PROFILE: '/profile',
  SETTINGS: '/settings'
} as const;