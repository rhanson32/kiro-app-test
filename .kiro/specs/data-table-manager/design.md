# Data Table Manager Design Document

## Overview

The Data Table Manager is a modern web application built with React and AWS Amplify that provides comprehensive data management capabilities. The system integrates with Microsoft Entra ID for authentication and connects to Databricks for data storage and operations. The application features a responsive table interface for viewing, editing, and managing data entries, with support for both individual and bulk operations through CSV upload.

The architecture follows a client-server pattern with React handling the frontend user interface, AWS Amplify providing the hosting and backend services, and Databricks serving as the data layer. Authentication is handled through Entra ID integration, ensuring secure access to organizational data.

## Architecture

The system follows a three-tier architecture:

### Presentation Layer (React Frontend)
- React components for UI rendering and user interactions
- State management using React hooks and context
- Responsive design with mobile-first approach
- Real-time feedback and loading states

### Application Layer (AWS Amplify)
- Authentication integration with Entra ID
- API Gateway for routing requests
- Lambda functions for business logic
- File upload handling for CSV processing

### Data Layer (Databricks)
- Data storage and retrieval operations
- SQL query execution for CRUD operations
- Connection management and error handling
- Data validation and transformation

## Components and Interfaces

### Frontend Components

**TableView Component**
- Displays data in a paginated table format
- Handles sorting, filtering, and search functionality
- Manages row selection and bulk operations
- Responsive design for different screen sizes

**EntryForm Component**
- Modal or slide-out form for creating/editing entries
- Field validation and error display
- Dynamic form fields based on data schema
- Save/cancel operations with confirmation

**CSVUpload Component**
- File selection and drag-drop interface
- CSV parsing and validation
- Preview of data before import
- Progress tracking and error reporting

**Authentication Component**
- Entra ID login integration
- Session management and token refresh
- Protected route handling
- User profile display

### Backend Services

**DataService**
- Databricks connection management
- SQL query execution and result processing
- Error handling and retry logic
- Data transformation utilities

**AuthService**
- Entra ID integration and token management
- User session validation
- Role-based access control
- Security middleware

**FileService**
- CSV file processing and validation
- Bulk import operations
- File format verification
- Error reporting and logging

## Data Models

### DataEntry Model
```typescript
interface DataEntry {
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
```

### User Model
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  lastLogin: Date;
}
```

### CSVImportResult Model
```typescript
interface CSVImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  importId: string;
  timestamp: Date;
}
```

### ImportError Model
```typescript
interface ImportError {
  row: number;
  field: string;
  value: string;
  errorMessage: string;
}
```#
# Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication failure handling
*For any* authentication failure scenario, the system should display appropriate error messages and prevent access to protected features
**Validates: Requirements 1.3**

### Property 2: Session expiration handling
*For any* expired session, the system should prompt for re-authentication
**Validates: Requirements 1.4**

### Property 3: Logout session termination
*For any* user logout action, the system should terminate the session and redirect to login
**Validates: Requirements 1.5**

### Property 4: Data display completeness
*For any* data retrieval operation, the table view should display all required columns including tags, product types, and aggregation information
**Validates: Requirements 2.2**

### Property 5: Large dataset performance optimization
*For any* dataset exceeding the threshold size, the system should implement pagination or virtual scrolling
**Validates: Requirements 2.3**

### Property 6: Loading state indication
*For any* data loading operation, the system should display appropriate loading indicators
**Validates: Requirements 2.4**

### Property 7: Search functionality
*For any* search text input and dataset, the system should filter and display only records matching the search criteria
**Validates: Requirements 3.1**

### Property 8: Filter functionality
*For any* filter criteria and dataset, the system should display only records that meet the filter conditions
**Validates: Requirements 3.2**

### Property 9: Real-time filter updates
*For any* change in search or filter criteria, the table view should update immediately
**Validates: Requirements 3.3**

### Property 10: Filter clearing round-trip
*For any* filtered dataset, clearing all filters should restore the complete original dataset
**Validates: Requirements 3.4**

### Property 11: Valid data entry creation
*For any* valid data entry submission, the system should create a new record and add it to the table
**Validates: Requirements 4.2**

### Property 12: Invalid data validation
*For any* invalid data submission, the system should display validation errors and prevent submission
**Validates: Requirements 4.3**

### Property 13: CSV file processing
*For any* valid CSV file upload, the system should validate the format and process the bulk import
**Validates: Requirements 4.4**

### Property 14: CSV error handling
*For any* CSV file containing validation errors, the system should display validation results and allow correction
**Validates: Requirements 4.5**

### Property 15: CSV parsing and preview
*For any* valid CSV file, the system should parse the file and provide a data preview for confirmation
**Validates: Requirements 5.2**

### Property 16: Bulk import execution
*For any* validated CSV data, the system should perform the bulk import and update the table view
**Validates: Requirements 5.3**

### Property 17: CSV upload error handling
*For any* CSV upload failure, the system should display specific error messages and allow retry
**Validates: Requirements 5.4**

### Property 18: Import completion reporting
*For any* completed CSV import, the system should provide a summary of successfully imported records
**Validates: Requirements 5.5**

### Property 19: Edit form population
*For any* existing data entry selection, the system should display the edit form populated with current values
**Validates: Requirements 6.1**

### Property 20: Valid data updates
*For any* valid data changes submission, the system should update the entry with new information
**Validates: Requirements 6.2**

### Property 21: Invalid update validation
*For any* invalid data changes submission, the system should display validation errors and prevent updates
**Validates: Requirements 6.3**

### Property 22: Update UI refresh
*For any* successful data update, the system should refresh the table view to show the changes
**Validates: Requirements 6.4**

### Property 23: Edit cancellation
*For any* edit operation cancellation, the system should discard changes and close the form
**Validates: Requirements 6.5**

### Property 24: Delete confirmation
*For any* data entry deletion request, the system should prompt for confirmation
**Validates: Requirements 7.1**

### Property 25: Delete execution
*For any* confirmed deletion, the system should remove the entry from the system
**Validates: Requirements 7.2**

### Property 26: Delete cancellation
*For any* deletion cancellation, the system should maintain the entry without changes
**Validates: Requirements 7.3**

### Property 27: Delete UI update
*For any* successful deletion, the system should update the table view to remove the deleted record
**Validates: Requirements 7.4**

### Property 28: Delete error handling
*For any* deletion failure, the system should display error messages and maintain current state
**Validates: Requirements 7.5**

### Property 29: Data retrieval and transformation
*For any* data query operation, the system should retrieve from Databricks and transform results for display
**Validates: Requirements 8.2**

### Property 30: SQL execution for CRUD
*For any* create or update operation, the system should execute appropriate SQL commands against Databricks
**Validates: Requirements 8.3**

### Property 31: Databricks error handling
*For any* Databricks operation failure, the system should handle errors gracefully and provide retry mechanisms
**Validates: Requirements 8.4**

### Property 32: Connection recovery
*For any* connection loss scenario, the system should attempt reconnection and notify users of connectivity status
**Validates: Requirements 8.5**

### Property 33: Network error handling
*For any* network error, the system should display appropriate error messages and retry options
**Validates: Requirements 9.1**

### Property 34: Server error handling
*For any* server error, the system should log the error and display user-friendly messages
**Validates: Requirements 9.2**

### Property 35: Validation error display
*For any* validation error, the system should highlight problematic fields and provide clear guidance
**Validates: Requirements 9.3**

### Property 36: Authentication error handling
*For any* authentication error, the system should redirect to the login flow
**Validates: Requirements 9.4**

### Property 37: Responsive design adaptation
*For any* mobile device access, the system should adapt the interface for smaller screens
**Validates: Requirements 10.1**

### Property 38: Operation feedback
*For any* user operation, the system should provide immediate feedback and maintain responsiveness
**Validates: Requirements 10.3**

### Property 39: View transition smoothness
*For any* view switch operation, the system should maintain smooth transitions and interactions
**Validates: Requirements 10.5**

## Error Handling

The system implements comprehensive error handling across all layers:

### Frontend Error Handling
- React Error Boundaries to catch and display component errors
- Form validation with real-time feedback
- Network error detection and retry mechanisms
- User-friendly error messages with actionable guidance

### Backend Error Handling
- Lambda function error catching and logging
- Databricks connection error handling with retry logic
- Authentication error handling with proper redirects
- File upload error handling with detailed feedback

### Data Layer Error Handling
- SQL execution error handling
- Connection timeout and retry mechanisms
- Data validation errors with specific field feedback
- Transaction rollback on operation failures

## Testing Strategy

The application will use a dual testing approach combining unit tests and property-based tests to ensure comprehensive coverage and correctness validation.

### Unit Testing Approach
- **React Testing Library** for component testing
- **Jest** as the test runner and assertion library
- **MSW (Mock Service Worker)** for API mocking
- Focus on specific examples, user interactions, and integration points
- Test individual component behavior and edge cases
- Verify error states and loading conditions

### Property-Based Testing Approach
- **fast-check** library for JavaScript property-based testing
- Minimum of 100 iterations per property test to ensure thorough validation
- Each property test tagged with format: **Feature: data-table-manager, Property {number}: {property_text}**
- Generate random test data to verify universal properties
- Test data transformation and validation logic
- Verify CRUD operations maintain data integrity

### Testing Configuration
- Property-based tests configured to run 100+ iterations
- Each correctness property implemented as a single property-based test
- Unit tests complement property tests by covering specific scenarios
- Integration tests verify end-to-end workflows
- Performance tests for large dataset handling

### Test Data Generation
- Smart generators for DataEntry objects with realistic field values
- CSV file generators for bulk import testing
- User session and authentication state generators
- Error condition generators for failure scenario testing