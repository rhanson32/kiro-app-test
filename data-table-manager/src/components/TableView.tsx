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
import { DataEntry, DataEntryFormData } from '../types/DataEntry';
import { getDataService } from '../services/DataService';
import { formatDateTime, formatNumber } from '../utils/formatting';
import { EntryForm } from './EntryForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEntry, setSelectedEntry] = useState<DataEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<DataEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const handleCreateNew = () => {
    setFormMode('create');
    setSelectedEntry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (entry: DataEntry) => {
    setFormMode('edit');
    setSelectedEntry(entry);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: DataEntryFormData) => {
    try {
      const dataService = getDataService();
      
      if (formMode === 'create') {
        await dataService.createEntry(data);
      } else if (formMode === 'edit' && selectedEntry) {
        await dataService.updateEntry(selectedEntry.id, data);
      }
      
      // Reload entries after successful create/update
      await loadEntries();
      setIsFormOpen(false);
    } catch (err) {
      console.error('Form submission error:', err);
      throw err; // Re-throw to let form handle the error
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedEntry(null);
  };

  const handleDeleteClick = (entry: DataEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    
    try {
      setIsDeleting(true);
      const dataService = getDataService();
      await dataService.deleteEntry(entryToDelete.id);
      
      // Reload entries after successful deletion
      await loadEntries();
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

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
          const badgeClass = isDeleted 
            ? 'bg-red-100 text-red-800' 
            : isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800';
          return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${badgeClass}`}>{status}</span>;
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
          <div className="flex gap-2">
            <button
              className="bg-transparent border-none cursor-pointer text-xl p-1 px-2 rounded hover:bg-gray-200 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(info.row.original);
              }}
              title="Edit"
            >
              ✏️
            </button>
            <button
              className="bg-transparent border-none cursor-pointer text-xl p-1 px-2 rounded hover:bg-gray-200 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(info.row.original);
              }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        ),
        size: 100,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="w-full p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-teal-800 rounded-full animate-spin mb-4"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col items-center justify-center py-16 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 text-base mb-4">⚠️ {error}</p>
          <button 
            className="px-5 py-2.5 bg-teal-800 text-white rounded-md text-sm font-medium hover:bg-teal-900 transition-all"
            onClick={testConnectionFirst}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="w-full p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <p className="text-lg my-2">No data entries found</p>
          <p className="text-sm text-gray-400">Add your first entry to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-4 bg-white px-6 py-5 rounded-lg shadow-sm">
        <h2 className="m-0 text-gray-800 text-2xl font-semibold">Data Entries</h2>
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <input
            type="text"
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md cursor-pointer text-base text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-primary text-white rounded-md cursor-pointer text-sm font-medium hover:bg-primary-hover transition-all whitespace-nowrap"
            title="Create new entry"
          >
            + New Entry
          </button>
        </div>
        <div className="text-gray-600 text-sm whitespace-nowrap">
          Showing {table.getFilteredRowModel().rows.length} of {entries.length} entries
        </div>
      </div>

      <div className="h-[calc(100vh-200px)] overflow-y-auto overflow-x-auto bg-white rounded-lg shadow-md relative">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead className="bg-gray-50 border-b-2 border-gray-300 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2 text-left font-semibold text-gray-700 text-sm uppercase tracking-wide bg-gray-50 select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() && (
                        <span className="text-teal-800 text-xs">
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
              const isDeleted = !!(entry.is_deleted);
              const isActive = entry.is_active === undefined ? true : !!(entry.is_active);
              const rowClass = isDeleted 
                ? 'bg-red-50 opacity-60' 
                : isActive 
                ? 'bg-white' 
                : 'bg-white opacity-85';
              
              return (
                <tr
                  key={row.id}
                  onClick={() => onEntrySelect?.(entry)}
                  className={`border-b border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors ${rowClass}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-1.5 text-sm text-gray-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EntryForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        entry={selectedEntry}
        mode={formMode}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        entryName={entryToDelete?.scada_tag || entryToDelete?.pi_tag}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default TableView;
