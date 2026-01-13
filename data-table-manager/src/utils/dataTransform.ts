// Data transformation utilities

import { DataEntry, DataEntryFormData } from '../types/DataEntry';

/**
 * Transform DataEntry to form data (for editing)
 */
export function dataEntryToFormData(entry: DataEntry): DataEntryFormData {
  return {
    scada_tag: entry.scada_tag,
    pi_tag: entry.pi_tag,
    product_type: entry.product_type,
    tag_type: entry.tag_type,
    aggregation_type: entry.aggregation_type,
    conversion_factor: entry.conversion_factor,
    ent_hid: entry.ent_hid,
    test_site: entry.test_site,
    api10: entry.api10,
    uom: entry.uom,
    meter_id: entry.meter_id
  };
}

/**
 * Transform form data to DataEntry (for creation)
 */
export function formDataToDataEntry(
  formData: DataEntryFormData,
  userId: string,
  existingEntry?: DataEntry
): Partial<DataEntry> {
  const now = new Date();
  
  if (existingEntry) {
    // Update existing entry
    return {
      ...formData,
      change_user: userId,
      change_date: now
    };
  } else {
    // Create new entry
    return {
      ...formData,
      id: generateId(),
      is_active: true,
      is_deleted: false,
      create_user: userId,
      create_date: now,
      change_user: userId,
      change_date: now
    };
  }
}

/**
 * Generate a unique ID for new entries
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString: string): Record<string, any>[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
    }

    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Convert array of DataEntry to CSV string
 */
export function dataEntriesToCSV(entries: DataEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  // Define column order
  const columns: (keyof DataEntry)[] = [
    'id',
    'scada_tag',
    'pi_tag',
    'product_type',
    'tag_type',
    'aggregation_type',
    'conversion_factor',
    'ent_hid',
    'is_active',
    'is_deleted',
    'create_user',
    'create_date',
    'change_user',
    'change_date',
    'test_site',
    'api10',
    'uom',
    'meter_id'
  ];

  // Create header row
  const header = columns.join(',');

  // Create data rows
  const rows = entries.map(entry => {
    return columns.map(col => {
      const value = entry[col];
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Filter data entries based on search query
 */
export function filterBySearch(entries: DataEntry[], searchQuery: string): DataEntry[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return entries;
  }

  const query = searchQuery.toLowerCase();
  return entries.filter(entry => {
    return (
      entry.scada_tag.toLowerCase().includes(query) ||
      entry.pi_tag.toLowerCase().includes(query) ||
      entry.product_type.toLowerCase().includes(query) ||
      entry.tag_type.toLowerCase().includes(query) ||
      entry.test_site?.toLowerCase().includes(query) ||
      entry.meter_id?.toLowerCase().includes(query)
    );
  });
}

/**
 * Sort data entries by field
 */
export function sortEntries(
  entries: DataEntry[],
  sortBy: keyof DataEntry,
  sortOrder: 'asc' | 'desc'
): DataEntry[] {
  return [...entries].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      comparison = aVal < bVal ? -1 : 1;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Paginate data entries
 */
export function paginateEntries(
  entries: DataEntry[],
  page: number,
  pageSize: number
): DataEntry[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return entries.slice(startIndex, endIndex);
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(totalItems: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total: totalItems,
    totalPages: Math.ceil(totalItems / pageSize)
  };
}
