// Validation utilities for form data and CSV imports

import { DataEntryFormData } from '../types/DataEntry';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Data entry validation rules
export const validateDataEntry = (data: Partial<DataEntryFormData>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required field validations
  if (!data.scada_tag?.trim()) {
    errors.push({ field: 'scada_tag', message: 'SCADA tag is required' });
  }

  if (!data.pi_tag?.trim()) {
    errors.push({ field: 'pi_tag', message: 'PI tag is required' });
  }

  if (!data.product_type?.trim()) {
    errors.push({ field: 'product_type', message: 'Product type is required' });
  }

  if (!data.tag_type?.trim()) {
    errors.push({ field: 'tag_type', message: 'Tag type is required' });
  }

  if (!data.aggregation_type?.trim()) {
    errors.push({ field: 'aggregation_type', message: 'Aggregation type is required' });
  }

  if (!data.test_site?.trim()) {
    errors.push({ field: 'test_site', message: 'Test site is required' });
  }

  if (!data.uom?.trim()) {
    errors.push({ field: 'uom', message: 'Unit of measure is required' });
  }

  // Numeric validations
  if (data.conversion_factor !== undefined && (isNaN(data.conversion_factor) || data.conversion_factor <= 0)) {
    errors.push({ field: 'conversion_factor', message: 'Conversion factor must be a positive number' });
  }

  if (data.ent_hid !== undefined && (!Number.isInteger(data.ent_hid) || data.ent_hid < 0)) {
    errors.push({ field: 'ent_hid', message: 'ENT HID must be a non-negative integer' });
  }

  // Format validations
  if (data.scada_tag && data.scada_tag.length > 100) {
    errors.push({ field: 'scada_tag', message: 'SCADA tag must be 100 characters or less' });
  }

  if (data.pi_tag && data.pi_tag.length > 100) {
    errors.push({ field: 'pi_tag', message: 'PI tag must be 100 characters or less' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// CSV validation utilities
export const validateCSVHeaders = (headers: string[]): ValidationResult => {
  const requiredHeaders = [
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
  ];

  const errors: ValidationError[] = [];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    errors.push({
      field: 'headers',
      message: `Missing required headers: ${missingHeaders.join(', ')}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic form validation helper
export const hasValidationErrors = (errors: ValidationError[]): boolean => {
  return errors.length > 0;
};

// Get error message for a specific field
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(err => err.field === fieldName);
  return error?.message;
};