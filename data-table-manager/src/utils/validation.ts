// Data validation utilities for DataEntry

import { DataEntryFormData } from '../types/DataEntry';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a DataEntry form submission
 */
export function validateDataEntry(data: Partial<DataEntryFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field validations
  if (!data.scada_tag || data.scada_tag.trim() === '') {
    errors.push({ field: 'scada_tag', message: 'SCADA tag is required' });
  }

  if (!data.pi_tag || data.pi_tag.trim() === '') {
    errors.push({ field: 'pi_tag', message: 'PI tag is required' });
  }

  if (!data.product_type || data.product_type.trim() === '') {
    errors.push({ field: 'product_type', message: 'Product type is required' });
  }

  if (!data.tag_type || data.tag_type.trim() === '') {
    errors.push({ field: 'tag_type', message: 'Tag type is required' });
  }

  if (!data.aggregation_type || data.aggregation_type.trim() === '') {
    errors.push({ field: 'aggregation_type', message: 'Aggregation type is required' });
  }

  if (!data.uom || data.uom.trim() === '') {
    errors.push({ field: 'uom', message: 'Unit of measure is required' });
  }

  // Numeric field validations
  if (data.conversion_factor === undefined || data.conversion_factor === null) {
    errors.push({ field: 'conversion_factor', message: 'Conversion factor is required' });
  } else if (isNaN(data.conversion_factor)) {
    errors.push({ field: 'conversion_factor', message: 'Conversion factor must be a number' });
  } else if (data.conversion_factor < 0) {
    errors.push({ field: 'conversion_factor', message: 'Conversion factor must be non-negative' });
  }

  if (data.ent_hid === undefined || data.ent_hid === null) {
    errors.push({ field: 'ent_hid', message: 'Entity HID is required' });
  } else if (!Number.isInteger(data.ent_hid)) {
    errors.push({ field: 'ent_hid', message: 'Entity HID must be an integer' });
  } else if (data.ent_hid < 0) {
    errors.push({ field: 'ent_hid', message: 'Entity HID must be non-negative' });
  }

  // Optional field validations (format checks)
  if (data.test_site && data.test_site.length > 100) {
    errors.push({ field: 'test_site', message: 'Test site must be 100 characters or less' });
  }

  if (data.api10 && data.api10.length > 50) {
    errors.push({ field: 'api10', message: 'API10 must be 50 characters or less' });
  }

  if (data.meter_id && data.meter_id.length > 50) {
    errors.push({ field: 'meter_id', message: 'Meter ID must be 50 characters or less' });
  }

  // Tag format validations (basic checks)
  if (data.scada_tag && data.scada_tag.length > 200) {
    errors.push({ field: 'scada_tag', message: 'SCADA tag must be 200 characters or less' });
  }

  if (data.pi_tag && data.pi_tag.length > 200) {
    errors.push({ field: 'pi_tag', message: 'PI tag must be 200 characters or less' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single field value
 */
export function validateField(field: keyof DataEntryFormData, value: any): ValidationError | null {
  const partialData: Partial<DataEntryFormData> = { [field]: value };
  const result = validateDataEntry(partialData);
  
  const fieldError = result.errors.find(err => err.field === field);
  return fieldError || null;
}

/**
 * Sanitize string input (trim whitespace, prevent XSS)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Validate CSV row data
 */
export function validateCSVRow(row: Record<string, any>, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Map CSV columns to DataEntryFormData
  const data: Partial<DataEntryFormData> = {
    scada_tag: row.scada_tag,
    pi_tag: row.pi_tag,
    product_type: row.product_type,
    tag_type: row.tag_type,
    aggregation_type: row.aggregation_type,
    conversion_factor: parseFloat(row.conversion_factor),
    ent_hid: parseInt(row.ent_hid, 10),
    test_site: row.test_site,
    api10: row.api10,
    uom: row.uom,
    meter_id: row.meter_id
  };

  const validationResult = validateDataEntry(data);
  
  // Add row number to error messages
  return validationResult.errors.map(err => ({
    field: `Row ${rowNumber}: ${err.field}`,
    message: err.message
  }));
}

/**
 * Check if a value is empty (null, undefined, or empty string)
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
