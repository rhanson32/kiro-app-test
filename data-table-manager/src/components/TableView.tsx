import React, { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { DataEntry } from '../types/DataEntry';
import { getDataService } from '../services/DataService';
import { formatDateTime, formatNumber } from '../utils/formatting';
import './TableView.css';

interface TableViewProps {
  onEntrySelect?: (entry: DataEntry) => void;
  onEntryEdit?: (entry: DataEntry) => void;
  onEntryDelete?: (entry: DataEntry) => void;
}

const columnHelper = createColumnHelper<DataEntry>();

export const TableView: React.FC<TableViewProps> = ({
  onEntrySelect,
  onEntryEdit,
  onEntryDelete
}) => {
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState<boolean>(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    testConnectionFirst();
  }, []);

  const testConnectionFirst = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dataService = getDataService();
      const connected = await dataService.testConnection();
      
      if (connected) {
        setConnectionTested(true);
        loadEntries();
      } else {
        setError('Connection test failed. Check console for details.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Connection test error:', err);
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}.`);
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!connectionTested) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const dataService = getDataService();
      const result = await dataService.getEntries({
        page: 1,
        pageSize: 10000,
        sortBy: 'create_date',
        sortOrder: 'desc'
      });

      console.log('Sample entry:', result.data[0]);
      setEntries(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connectionTested) {
      loadEntries();
    }
  }, [connectionTested]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('scada_tag', {
        header: 'SCADA Tag',
        cell: info => info.getValue() || '-',
        size: 150,
      }),
      columnHelper.accessor('pi_tag', {
        header: 'PI Tag',
        cell: info => info.getValue() || '-',
        size: 150,
      }),
      columnHelper.accessor('product_type', {
        header: 'Product Type',
        cell: info => info.getValue() || '-',
        size: 120,
      }),
      columnHelper.accessor('tag_type', {
        header: 'Tag Type',
        cell: info => info.getValue() || '-',
        size: 100,
      }),
      columnHelper.accessor('aggregation_type', {
        header: 'Aggregation',
        cell: info => info.getValue() || '-',
        size: 110,
      }),
      columnHelper.accessor('conversion_factor', {
        header: 'Conversion Factor',
        cell: info => formatNumber(info.getValue(), 4),
        size: 130,
      }),
      columnHelper.accessor('ent_hid', {
        header: 'Entity HID',
        cell: info => info.getValue() || '-',
        size: 100,
      }),
      columnHelper.accessor('uom', {
        header: 'UOM',
        cell: info => info.getValue() || '-',
        size: 80,
      }),
      columnHelper.accessor('test_site', {
        header: 'Test Site',
        cell: info => info.getValue() || '-',
        size: 100,
      }),
      columnHelper.accessor('is_active', {
        header: 'Status',
        cell: info => {
          const row = info.row.original;
          const isDeleted = !!(row.is_deleted);
          const value = info.getValue();
          const isActive = value === undefined ? true : !!(value);
          const status = isDeleted ? 'Deleted' : isActive ? 'Active' : 'Inactive';
          const className = isDeleted ? 'deleted' : isActive ? 'active' : 'inactive';
          return <span className={`status-badge ${className}`}>{status}</span>;
        },
        size: 90,
      }),
      columnHelper.accessor('create_date', {
        header: 'Created',
        cell: info => formatDateTime(info.getValue()),
        size: 140,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: info => (
          <div className="action-buttons">
            {onEntryEdit && (
              <button
                className="action-btn edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEntryEdit(info.row.original);
                }}
                title="Edit"
              >
                ✏️
              </button>
            )}
            {onEntryDelete && (
              <button
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEntryDelete(info.row.original);
                }}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        ),
        size: 100,
      }),
    ],
    [onEntryEdit, onEntryDelete]
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="table-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-view">
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
          <button className="retry-button" onClick={testConnectionFirst}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="table-view">
        <div className="empty-state">
          <p>No data entries found</p>
          <p className="empty-hint">Add your first entry to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-view">
      <div className="table-header">
        <h2>Data Entries</h2>
        <div className="table-info">
          Showing {table.getFilteredRowModel().rows.length} of {entries.length} entries
        </div>
      </div>

      <div className="table-container-scrollable">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="header-content">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() && (
                        <span className="sort-indicator">
                          {header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const entry = row.original;
              // Default to active-row if is_deleted/is_active fields don't exist
              const isDeleted = !!(entry.is_deleted);
              const isActive = entry.is_active === undefined ? true : !!(entry.is_active);
              const rowClass = isDeleted ? 'deleted-row' : isActive ? 'active-row' : 'inactive-row';
              
              return (
                <tr
                  key={row.id}
                  onClick={() => onEntrySelect?.(entry)}
                  className={rowClass}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;
