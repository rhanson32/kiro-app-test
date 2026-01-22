// Formatting utilities for display and data transformation

import { DataEntry } from '../types/DataEntry';

// Date formatting utilities
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Number formatting utilities
export const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatConversionFactor = (factor: number): string => {
  return formatNumber(factor, 4);
};

// String formatting utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Status formatting
export const formatStatus = (isActive: boolean, isDeleted: boolean): string => {
  if (isDeleted) return 'Deleted';
  if (isActive) return 'Active';
  return 'Inactive';
};

export const getStatusColor = (isActive: boolean, isDeleted: boolean): string => {
  if (isDeleted) return 'text-red-600';
  if (isActive) return 'text-green-600';
  return 'text-gray-600';
};

// Data transformation utilities
export const transformDataEntryForDisplay = (entry: DataEntry) => {
  return {
    ...entry,
    formattedCreateDate: formatDateTime(entry.create_date),
    formattedChangeDate: formatDateTime(entry.change_date),
    formattedConversionFactor: formatConversionFactor(entry.conversion_factor),
    statusText: formatStatus(entry.is_active, entry.is_deleted),
    statusColor: getStatusColor(entry.is_active, entry.is_deleted)
  };
};

// CSV formatting utilities
export const escapeCSVField = (field: string): string => {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

export const formatDataEntryForCSV = (entry: DataEntry): string[] => {
  return [
    entry.id,
    entry.scada_tag,
    entry.pi_tag,
    entry.product_type,
    entry.tag_type,
    entry.aggregation_type,
    entry.conversion_factor.toString(),
    entry.ent_hid.toString(),
    entry.is_active.toString(),
    entry.is_deleted.toString(),
    entry.create_user,
    entry.create_date.toISOString(),
    entry.change_user,
    entry.change_date.toISOString(),
    entry.test_site,
    entry.api10,
    entry.uom,
    entry.meter_id
  ];
};