import React, { useEffect, useState, useMemo, useCallback, useDeferredValue, useTransition, useRef } from 'react';
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
import { useVirtualizer } from '@tanstack/react-virtual';
import { DataEntry, DataEntryFormData } from '../types/DataEntry';
import { getDataService } from '../services/DataService';
import { formatDateTime, formatNumber } from '../utils/formatting';
import { EntryForm } from './EntryForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CSVUpload } from './CSVUpload';

interface TableViewProps {
  onEntrySelect?: (entry: DataEntry) => void;
  onEntryEdit?: (entry: DataEntry) => void;
  onEntryDelete?: (entry: DataEntry) => void;
  userEmail?: string;
  cachedEntries: DataEntry[];
  setCachedEntries: (entries: DataEntry[]) => void;
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
}

const columnHelper = createColumnHelper<DataEntry>();

export const TableView: React.FC<TableViewProps> = ({
  onEntrySelect,
  onEntryEdit,
  onEntryDelete,
  userEmail,
  cachedEntries,
  setCachedEntries,
  dataLoaded,
  setDataLoaded
}) => {
  const [entries, setEntries] = useState<DataEntry[]>(cachedEntries);
  const [loading, setLoading] = useState<boolean>(!dataLoaded);
  const [error, setError] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState<boolean>(dataLoaded);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEntry, setSelectedEntry] = useState<DataEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<DataEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [assetTeamFilter, setAssetTeamFilter] = useState<string>('All');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('All');
  const [tagTypeFilter, setTagTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('Active'); // Default to Active only
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>(''); // Local search input for debouncing
  const [isPending, startTransition] = useTransition(); // Track filtering state
  
  // Ref for virtual scrolling container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Use deferred value for search to prevent blocking UI
  const deferredSearchInput = useDeferredValue(searchInput);

  useEffect(() => {
    // Only test connection and load if data hasn't been loaded yet
    if (!dataLoaded) {
      testConnectionFirst();
    } else {
      // Use cached data
      setEntries(cachedEntries);
      setLoading(false);
    }
  }, [dataLoaded]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(deferredSearchInput);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [deferredSearchInput]);

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
        pageSize: 999999,
        sortBy: 'create_date',
        sortOrder: 'desc'
      });

      console.log('Sample entry:', result.data[0]);
      setEntries(result.data);
      setCachedEntries(result.data); // Cache in App state
      setDataLoaded(true); // Mark as loaded
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Only load entries when connection is tested AND data hasn't been loaded yet
  useEffect(() => {
    if (connectionTested && !dataLoaded) {
      loadEntries();
    }
  }, [connectionTested, dataLoaded]);

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
        await dataService.createEntry(data, userEmail);
      } else if (formMode === 'edit' && selectedEntry) {
        await dataService.updateEntry(selectedEntry.id, data, userEmail);
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
      await dataService.deleteEntry(entryToDelete.id, userEmail);
      
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

  const handleDeactivateConfirm = async () => {
    if (!entryToDelete) return;
    
    try {
      setIsDeleting(true);
      const dataService = getDataService();
      await dataService.toggleActive(entryToDelete.id, false, userEmail);
      
      // Reload entries after successful deactivation
      await loadEntries();
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Deactivate error:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const handleToggleActive = async (entry: DataEntry) => {
    try {
      const dataService = getDataService();
      await dataService.toggleActive(entry.id, !entry.is_active, userEmail);
      
      // Reload entries after successful toggle
      await loadEntries();
    } catch (err) {
      console.error('Toggle active error:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle active status');
    }
  };

  const handleCSVImport = async (data: DataEntryFormData[]) => {
    try {
      const dataService = getDataService();
      
      // Convert data to CSV format for bulk import (include tplnr, exclude ent_hid)
      const header = 'scada_tag,pi_tag,product_type,tag_type,aggregation_type,tplnr,conversion_factor,test_site,api10,uom,meter_id';
      const rows = data.map(entry => 
        `${entry.scada_tag},${entry.pi_tag},${entry.product_type},${entry.tag_type},${entry.aggregation_type},${entry.tplnr || ''},${entry.conversion_factor || 0},${entry.test_site || ''},${entry.api10 || ''},${entry.uom || ''},${entry.meter_id || ''}`
      );
      const csvData = [header, ...rows].join('\n');
      
      const result = await dataService.bulkImport(csvData, userEmail);
      
      console.log('Import result:', result);
      
      // Reload entries after successful import
      await loadEntries();
      
      // Show success message
      if (result.failedImports > 0) {
        setError(`Import completed with ${result.successfulImports} successful and ${result.failedImports} failed imports`);
      }
    } catch (err) {
      console.error('CSV import error:', err);
      throw err; // Re-throw to let CSVUpload handle the error
    }
  };

  // Get unique values for dropdowns
  const uniqueAssetTeams = useMemo(() => {
    const teams = new Set(entries.map(entry => entry.asset_team).filter(Boolean));
    return ['All', ...Array.from(teams).sort()];
  }, [entries]);

  const uniqueProductTypes = useMemo(() => {
    const types = new Set(entries.map(entry => entry.product_type).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [entries]);

  const uniqueTagTypes = useMemo(() => {
    const types = new Set(entries.map(entry => entry.tag_type).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [entries]);

  // Filter entries based on all filter selections
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (assetTeamFilter !== 'All' && entry.asset_team !== assetTeamFilter) return false;
      if (productTypeFilter !== 'All' && entry.product_type !== productTypeFilter) return false;
      if (tagTypeFilter !== 'All' && entry.tag_type !== tagTypeFilter) return false;
      
      // Status filter
      if (statusFilter === 'Active' && !entry.is_active) return false;
      if (statusFilter === 'Inactive' && entry.is_active) return false;
      // 'All' shows both active and inactive
      
      return true;
    });
  }, [entries, assetTeamFilter, productTypeFilter, tagTypeFilter, statusFilter]);

  // Custom global filter function that includes entname and tplnr
  const globalFilterFn = useCallback((row: any, columnId: string, filterValue: string) => {
    if (!filterValue) return true;
    
    const searchLower = filterValue.toLowerCase();
    const entry = row.original as DataEntry;
    
    // Search across all relevant fields including entname and tplnr
    const searchableFields = [
      entry.pi_tag,
      entry.scada_tag,
      entry.product_type,
      entry.tag_type,
      entry.aggregation_type,
      entry.entname,
      entry.tplnr,
      entry.asset_team,
      entry.ent_hid?.toString()
    ];
    
    return searchableFields.some(field => 
      field?.toString().toLowerCase().includes(searchLower)
    );
  }, []);

  // Memoize handlers to prevent column re-creation
  const handleToggleActiveCallback = useCallback((entry: DataEntry) => {
    handleToggleActive(entry);
  }, []);

  const handleEditCallback = useCallback((entry: DataEntry) => {
    handleEdit(entry);
  }, []);

  const handleDeleteClickCallback = useCallback((entry: DataEntry) => {
    handleDeleteClick(entry);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('pi_tag', {
        header: 'PI Tag',
        cell: info => {
          const value = info.getValue() || '-';
          return <span title={value}>{value}</span>;
        },
        size: 220,
      }),
      columnHelper.accessor('scada_tag', {
        header: 'SCADA Tag',
        cell: info => {
          const value = info.getValue() || '-';
          return <span title={value}>{value}</span>;
        },
        size: 220,
      }),
      columnHelper.accessor('product_type', {
        header: 'Product Type',
        cell: info => info.getValue() || '-',
        size: 110,
      }),
      columnHelper.accessor('tag_type', {
        header: 'Tag Type',
        cell: info => info.getValue() || '-',
        size: 130,
      }),
      columnHelper.accessor('aggregation_type', {
        header: 'Aggregation',
        cell: info => info.getValue() || '-',
        size: 100,
      }),
      columnHelper.accessor('ent_hid', {
        header: 'FDC HID',
        cell: info => info.getValue() || '-',
        size: 90,
      }),
      columnHelper.accessor('entname', {
        header: 'Entity Name',
        cell: info => {
          const value = info.getValue() || '-';
          return <span title={value}>{value}</span>;
        },
        size: 220,
      }),
      columnHelper.accessor('tplnr', {
        header: 'TPLNR',
        cell: info => info.getValue() || '-',
        size: 90,
      }),
      columnHelper.accessor('asset_team', {
        header: 'Asset Team',
        cell: info => info.getValue() || '-',
        size: 110,
      }),
      columnHelper.accessor('is_active', {
        header: 'Status',
        cell: info => (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            info.getValue() 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {info.getValue() ? 'Active' : 'Inactive'}
          </span>
        ),
        size: 80,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: info => {
          const entry = info.row.original;
          const isActive = entry.is_active;
          
          return (
            <div className="flex gap-1">
              {isActive ? (
                <>
                  <button
                    className="bg-transparent border-none cursor-pointer text-sm p-1 rounded hover:bg-red-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActiveCallback(entry);
                    }}
                    title="Deactivate"
                  >
                    🚫
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer text-sm p-1 rounded hover:bg-blue-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCallback(entry);
                    }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer text-sm p-1 rounded hover:bg-red-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClickCallback(entry);
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <button
                  className="bg-transparent border-none cursor-pointer text-sm p-1 rounded hover:bg-green-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActiveCallback(entry);
                  }}
                  title="Reactivate"
                >
                  ✅
                </button>
              )}
            </div>
          );
        },
        size: 100,
      }),
    ],
    [handleToggleActiveCallback, handleEditCallback, handleDeleteClickCallback]
  );

  const table = useReactTable({
    data: filteredEntries,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterFn as any,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Get the filtered rows for virtualization
  const { rows } = table.getRowModel();

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 33, // Estimated row height in pixels
    overscan: 10, // Render 10 extra rows above/below viewport for smooth scrolling
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
      <div className="bg-white px-6 py-5 rounded-lg shadow-sm mb-5">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          {/* Filters on the left */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="asset-team-filter" className="text-sm text-gray-700 font-medium whitespace-nowrap">
                Asset Team:
              </label>
              <select
                id="asset-team-filter"
                value={assetTeamFilter}
                onChange={(e) => {
                  startTransition(() => {
                    setAssetTeamFilter(e.target.value);
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all bg-white cursor-pointer"
              >
                {uniqueAssetTeams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="product-type-filter" className="text-sm text-gray-700 font-medium whitespace-nowrap">
                Product Type:
              </label>
              <select
                id="product-type-filter"
                value={productTypeFilter}
                onChange={(e) => {
                  startTransition(() => {
                    setProductTypeFilter(e.target.value);
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all bg-white cursor-pointer"
              >
                {uniqueProductTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="tag-type-filter" className="text-sm text-gray-700 font-medium whitespace-nowrap">
                Tag Type:
              </label>
              <select
                id="tag-type-filter"
                value={tagTypeFilter}
                onChange={(e) => {
                  startTransition(() => {
                    setTagTypeFilter(e.target.value);
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all bg-white cursor-pointer"
              >
                {uniqueTagTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm text-gray-700 font-medium whitespace-nowrap">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  startTransition(() => {
                    setStatusFilter(e.target.value);
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all bg-white cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* Entry count, Search and Buttons on the right */}
          <div className="flex items-center gap-2">
            <div className="text-gray-600 text-sm whitespace-nowrap">
              Showing {table.getFilteredRowModel().rows.length} entries
            </div>
            <input
              type="text"
              placeholder="Search all columns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/10 transition-all w-64"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md cursor-pointer text-base text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setIsCSVUploadOpen(true)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-all whitespace-nowrap"
              title="Import CSV"
            >
              📤 Import CSV
            </button>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-primary text-white rounded-md cursor-pointer text-sm font-medium hover:bg-primary-hover transition-all whitespace-nowrap"
              title="Create new entry"
            >
              + New Entry
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={tableContainerRef}
        className="h-[calc(100vh-200px)] overflow-y-auto bg-white rounded-lg shadow-md relative"
      >
        {/* Filtering overlay */}
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-6 h-6 border-3 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Filtering...</span>
            </div>
          </div>
        )}
        
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-gray-50 border-b-2 border-gray-300 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide bg-gray-50 select-none cursor-pointer align-middle flex-shrink-0"
                    style={{ width: `${header.getSize()}px` }}
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
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', display: 'block' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index];
              const entry = row.original;
              
              return (
                <tr
                  key={row.id}
                  onClick={() => onEntrySelect?.(entry)}
                  className="border-b border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors bg-white flex w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td 
                      key={cell.id} 
                      className="px-2 py-1 text-xs text-gray-800 truncate overflow-hidden whitespace-nowrap flex-shrink-0"
                      style={{ width: `${cell.column.getSize()}px` }}
                    >
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
        onDeactivate={handleDeactivateConfirm}
        onDelete={handleDeleteConfirm}
        entryName={entryToDelete?.scada_tag || entryToDelete?.pi_tag}
        isProcessing={isDeleting}
      />

      <CSVUpload
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
        onImport={handleCSVImport}
      />
    </div>
  );
};

export default TableView;
