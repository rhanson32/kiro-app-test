import React, { useState, useRef } from 'react';
import { DataEntryFormData } from '../types/DataEntry';

interface CSVUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: DataEntryFormData[]) => Promise<void>;
}

interface ParsedRow {
  data: Partial<DataEntryFormData>;
  errors: string[];
  rowNumber: number;
}

export const CSVUpload: React.FC<CSVUploadProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile);
    } else {
      setError('Please drop a valid CSV file');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setParsedData([]);
    
    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected columns
    const requiredColumns = ['scada_tag', 'pi_tag', 'product_type', 'tag_type', 'aggregation_type', 'tplnr'];
    const optionalColumns = ['conversion_factor', 'test_site', 'api10', 'uom', 'meter_id'];
    
    // Validate header
    const missingRequired = requiredColumns.filter(col => !header.includes(col));
    if (missingRequired.length > 0) {
      throw new Error(`Missing required columns: ${missingRequired.join(', ')}`);
    }

    // Parse data rows
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Partial<DataEntryFormData> = {};
      const errors: string[] = [];

      header.forEach((col, index) => {
        const value = values[index];
        
        if (requiredColumns.includes(col) && !value) {
          errors.push(`${col} is required`);
        }

        // Map values to row object
        if (col === 'conversion_factor') {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            row.conversion_factor = num;
          } else if (value) {
            errors.push(`Invalid conversion_factor: ${value}`);
          }
        } else if (col === 'ent_hid') {
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            row.ent_hid = num;
          } else if (value) {
            errors.push(`Invalid ent_hid: ${value}`);
          }
        } else if (requiredColumns.includes(col) || optionalColumns.includes(col)) {
          (row as any)[col] = value;
        }
      });

      parsed.push({
        data: row,
        errors,
        rowNumber: i + 1
      });
    }

    return parsed;
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.errors.length === 0);
    
    if (validRows.length === 0) {
      setError('No valid rows to import');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await onImport(validRows.map(row => row.data as DataEntryFormData));
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsDragging(false);
    onClose();
  };

  const validCount = parsedData.filter(row => row.errors.length === 0).length;
  const errorCount = parsedData.filter(row => row.errors.length > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Import CSV</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg text-gray-700 mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="mt-6 text-xs text-gray-500">
                <p className="font-semibold mb-2">Required columns:</p>
                <p>scada_tag, pi_tag, product_type, tag_type, aggregation_type, tplnr</p>
                <p className="font-semibold mt-3 mb-2">Optional columns:</p>
                <p>conversion_factor, test_site, api10, uom, meter_id</p>
                <p className="text-xs text-gray-400 mt-3">
                  Note: ent_hid will be automatically looked up from tplnr
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* File info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {parsedData.length} rows • {validCount} valid • {errorCount} errors
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setParsedData([]);
                      setError(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                    disabled={isProcessing}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Preview */}
              {parsedData.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Preview</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Row</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">SCADA Tag</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">PI Tag</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Product Type</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Errors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 50).map((row, index) => (
                            <tr
                              key={index}
                              className={`border-t border-gray-200 ${
                                row.errors.length > 0 ? 'bg-red-50' : 'bg-white'
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-600">{row.rowNumber}</td>
                              <td className="px-3 py-2">
                                {row.errors.length === 0 ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-red-600">✗</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-800">{row.data.scada_tag || '-'}</td>
                              <td className="px-3 py-2 text-gray-800">{row.data.pi_tag || '-'}</td>
                              <td className="px-3 py-2 text-gray-800">{row.data.product_type || '-'}</td>
                              <td className="px-3 py-2 text-red-600 text-xs">
                                {row.errors.join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 50 && (
                      <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600 border-t border-gray-200">
                        Showing first 50 of {parsedData.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {file && parsedData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing || validCount === 0}
            >
              {isProcessing ? 'Importing...' : `Import ${validCount} Rows`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
