import React, { useState, useEffect } from 'react';
import { DataEntry, DataEntryFormData } from '../types/DataEntry';
import { getDataService } from '../services/DataService';

interface EntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DataEntryFormData) => Promise<void>;
  entry?: DataEntry | null;
  mode: 'create' | 'edit';
}

export const EntryForm: React.FC<EntryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  entry,
  mode
}) => {
  const [formData, setFormData] = useState<DataEntryFormData>({
    scada_tag: '',
    pi_tag: '',
    product_type: '',
    tag_type: '',
    aggregation_type: '',
    conversion_factor: 1.0,
    ent_hid: 0,
    tplnr: '',
    test_site: '',
    api10: '',
    uom: '',
    meter_id: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DataEntryFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagTypes, setTagTypes] = useState<string[]>([]);
  const [loadingTagTypes, setLoadingTagTypes] = useState(false);
  const [aggregationTypes, setAggregationTypes] = useState<string[]>([]);
  const [loadingAggregationTypes, setLoadingAggregationTypes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load tag types and aggregation types when form opens
      loadTagTypes();
      loadAggregationTypes();
    }
    
    if (entry && mode === 'edit') {
      setFormData({
        scada_tag: entry.scada_tag || '',
        pi_tag: entry.pi_tag || '',
        product_type: entry.product_type || '',
        tag_type: entry.tag_type || '',
        aggregation_type: entry.aggregation_type || '',
        conversion_factor: entry.conversion_factor || 1.0,
        ent_hid: entry.ent_hid || 0,
        tplnr: entry.tplnr || '',
        test_site: entry.test_site || '',
        api10: entry.api10 || '',
        uom: entry.uom || '',
        meter_id: entry.meter_id || ''
      });
    } else {
      setFormData({
        scada_tag: '',
        pi_tag: '',
        product_type: '',
        tag_type: '',
        aggregation_type: '',
        conversion_factor: 1.0,
        ent_hid: 0,
        tplnr: '',
        test_site: '',
        api10: '',
        uom: '',
        meter_id: ''
      });
    }
    setErrors({});
  }, [entry, mode, isOpen]);

  const loadTagTypes = async () => {
    try {
      setLoadingTagTypes(true);
      const dataService = getDataService();
      const types = await dataService.getTagTypes();
      setTagTypes(types);
    } catch (error) {
      console.error('Error loading tag types:', error);
      // Form will still work with empty tag types array
    } finally {
      setLoadingTagTypes(false);
    }
  };

  const loadAggregationTypes = async () => {
    try {
      setLoadingAggregationTypes(true);
      const dataService = getDataService();
      const types = await dataService.getAggregationTypes();
      setAggregationTypes(types);
    } catch (error) {
      console.error('Error loading aggregation types:', error);
      // Form will still work with empty aggregation types array
    } finally {
      setLoadingAggregationTypes(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DataEntryFormData, string>> = {};

    if (!formData.scada_tag.trim()) newErrors.scada_tag = 'SCADA Tag is required';
    if (!formData.pi_tag.trim()) newErrors.pi_tag = 'PI Tag is required';
    if (!formData.product_type.trim()) newErrors.product_type = 'Product Type is required';
    if (!formData.tag_type.trim()) newErrors.tag_type = 'Tag Type is required';
    if (!formData.aggregation_type.trim()) newErrors.aggregation_type = 'Aggregation Type is required';
    if (formData.conversion_factor <= 0) newErrors.conversion_factor = 'Conversion Factor must be greater than 0';
    if (!formData.tplnr.trim()) newErrors.tplnr = 'TPLNR is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Normalize whitespace in TPLNR (replace multiple spaces/tabs with single space, then trim)
      const normalizedTplnr = formData.tplnr.replace(/\s+/g, ' ').trim();
      
      // Lookup ent_hid from tplnr before submitting
      const dataService = getDataService();
      const tplnrToEntHidMap = await dataService.lookupEntHidFromTplnr([normalizedTplnr]);
      const ent_hid = tplnrToEntHidMap.get(normalizedTplnr);
      
      if (!ent_hid) {
        setErrors(prev => ({ ...prev, tplnr: `No entity found for TPLNR: ${normalizedTplnr}` }));
        setIsSubmitting(false);
        return;
      }
      
      // Submit with looked up ent_hid and normalized tplnr
      await onSubmit({ ...formData, tplnr: normalizedTplnr, ent_hid });
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({ ...prev, tplnr: 'Failed to lookup entity ID' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof DataEntryFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  const inputClass = (hasError: boolean) => 
    `px-3 py-2.5 border rounded-md text-sm text-gray-800 bg-white transition-all outline-none ${
      hasError 
        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/10' 
        : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10'
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
          <h2 className="m-0 text-2xl font-semibold text-gray-800">
            {mode === 'create' ? 'Create New Entry' : 'Edit Entry'}
          </h2>
          <button 
            className="bg-transparent border-none text-2xl text-gray-500 cursor-pointer p-1 px-2 rounded hover:bg-gray-100 hover:text-gray-800 transition-all" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Required Fields Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Required Fields</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* SCADA Tag */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="scada_tag" className="text-sm font-medium text-gray-700">SCADA Tag *</label>
                <input
                  id="scada_tag"
                  type="text"
                  value={formData.scada_tag}
                  onChange={(e) => handleChange('scada_tag', e.target.value)}
                  className={inputClass(!!errors.scada_tag)}
                />
                {errors.scada_tag && <span className="text-xs text-red-500 mt-0.5">{errors.scada_tag}</span>}
              </div>

              {/* PI Tag */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pi_tag" className="text-sm font-medium text-gray-700">PI Tag *</label>
                <input
                  id="pi_tag"
                  type="text"
                  value={formData.pi_tag}
                  onChange={(e) => handleChange('pi_tag', e.target.value)}
                  className={inputClass(!!errors.pi_tag)}
                />
                {errors.pi_tag && <span className="text-xs text-red-500 mt-0.5">{errors.pi_tag}</span>}
              </div>

              {/* Product Type */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="product_type" className="text-sm font-medium text-gray-700">Product Type *</label>
                <select
                  id="product_type"
                  value={formData.product_type}
                  onChange={(e) => handleChange('product_type', e.target.value)}
                  className={inputClass(!!errors.product_type)}
                >
                  <option value="">Select Product Type</option>
                  <option value="Gas">Gas</option>
                  <option value="Oil">Oil</option>
                  <option value="Water">Water</option>
                  <option value="None">None</option>
                </select>
                {errors.product_type && <span className="text-xs text-red-500 mt-0.5">{errors.product_type}</span>}
              </div>

              {/* Tag Type */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tag_type" className="text-sm font-medium text-gray-700">Tag Type *</label>
                <select
                  id="tag_type"
                  value={formData.tag_type}
                  onChange={(e) => handleChange('tag_type', e.target.value)}
                  className={inputClass(!!errors.tag_type)}
                  disabled={loadingTagTypes}
                >
                  <option value="">
                    {loadingTagTypes ? 'Loading...' : 'Select Tag Type'}
                  </option>
                  {tagTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.tag_type && <span className="text-xs text-red-500 mt-0.5">{errors.tag_type}</span>}
              </div>

              {/* Aggregation Type */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="aggregation_type" className="text-sm font-medium text-gray-700">Aggregation Type *</label>
                <select
                  id="aggregation_type"
                  value={formData.aggregation_type}
                  onChange={(e) => handleChange('aggregation_type', e.target.value)}
                  className={inputClass(!!errors.aggregation_type)}
                  disabled={loadingAggregationTypes}
                >
                  <option value="">
                    {loadingAggregationTypes ? 'Loading...' : 'Select Aggregation Type'}
                  </option>
                  {aggregationTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.aggregation_type && <span className="text-xs text-red-500 mt-0.5">{errors.aggregation_type}</span>}
              </div>

              {/* Conversion Factor */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="conversion_factor" className="text-sm font-medium text-gray-700">Conversion Factor *</label>
                <input
                  id="conversion_factor"
                  type="number"
                  step="0.0001"
                  value={formData.conversion_factor}
                  onChange={(e) => handleChange('conversion_factor', parseFloat(e.target.value) || 0)}
                  className={inputClass(!!errors.conversion_factor)}
                />
                {errors.conversion_factor && <span className="text-xs text-red-500 mt-0.5">{errors.conversion_factor}</span>}
              </div>

              {/* TPLNR */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tplnr" className="text-sm font-medium text-gray-700">TPLNR *</label>
                <input
                  id="tplnr"
                  type="text"
                  value={formData.tplnr}
                  onChange={(e) => handleChange('tplnr', e.target.value)}
                  className={inputClass(!!errors.tplnr)}
                />
                {errors.tplnr && <span className="text-xs text-red-500 mt-0.5">{errors.tplnr}</span>}
              </div>
            </div>
          </div>

          {/* Additional Fields Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Additional Fields</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Unit of Measure */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="uom" className="text-sm font-medium text-gray-700">Unit of Measure</label>
                <input
                  id="uom"
                  type="text"
                  value={formData.uom}
                  onChange={(e) => handleChange('uom', e.target.value)}
                  className={inputClass(false)}
                />
              </div>

              {/* Test Site */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="test_site" className="text-sm font-medium text-gray-700">Test Site (Well Tests Only)</label>
                <input
                  id="test_site"
                  type="text"
                  value={formData.test_site}
                  onChange={(e) => handleChange('test_site', e.target.value)}
                  className={inputClass(false)}
                />
              </div>

              {/* API 10 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="api10" className="text-sm font-medium text-gray-700">API 10</label>
                <input
                  id="api10"
                  type="text"
                  value={formData.api10}
                  onChange={(e) => handleChange('api10', e.target.value)}
                  className={inputClass(false)}
                />
              </div>

              {/* Meter ID */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meter_id" className="text-sm font-medium text-gray-700">Meter ID</label>
                <input
                  id="meter_id"
                  type="text"
                  value={formData.meter_id}
                  onChange={(e) => handleChange('meter_id', e.target.value)}
                  className={inputClass(false)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all border-none bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Entry' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryForm;
