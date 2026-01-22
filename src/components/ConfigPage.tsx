import React, { useState, useEffect } from 'react';
import { getDataService } from '../services/DataService';

export const ConfigPage: React.FC = () => {
  const [tagTypes, setTagTypes] = useState<string[]>([]);
  const [aggregationTypes, setAggregationTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newTagType, setNewTagType] = useState('');
  const [newAggregationType, setNewAggregationType] = useState('');
  const [addingTagType, setAddingTagType] = useState(false);
  const [addingAggregationType, setAddingAggregationType] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataService = getDataService();
      
      const [tags, aggregations] = await Promise.all([
        dataService.getTagTypes(),
        dataService.getAggregationTypes()
      ]);
      
      setTagTypes(tags);
      setAggregationTypes(aggregations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTagType = async () => {
    if (!newTagType.trim()) return;
    
    try {
      setAddingTagType(true);
      const dataService = getDataService();
      await dataService.addTagType(newTagType.trim());
      setNewTagType('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag type');
    } finally {
      setAddingTagType(false);
    }
  };

  const handleAddAggregationType = async () => {
    if (!newAggregationType.trim()) return;
    
    try {
      setAddingAggregationType(true);
      const dataService = getDataService();
      await dataService.addAggregationType(newAggregationType.trim());
      setNewAggregationType('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add aggregation type');
    } finally {
      setAddingAggregationType(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Configuration</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tag Types Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tag Types</h2>
          
          {/* Add New Tag Type */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newTagType}
              onChange={(e) => setNewTagType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTagType()}
              placeholder="Enter new tag type"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={addingTagType}
            />
            <button
              onClick={handleAddTagType}
              disabled={addingTagType || !newTagType.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingTagType ? 'Adding...' : 'Add'}
            </button>
          </div>

          {/* Tag Types List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tagTypes.length === 0 ? (
              <p className="text-gray-500 text-sm">No tag types found</p>
            ) : (
              tagTypes.map((type, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-800"
                >
                  {type}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aggregation Types Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Aggregation Types</h2>
          
          {/* Add New Aggregation Type */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newAggregationType}
              onChange={(e) => setNewAggregationType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAggregationType()}
              placeholder="Enter new aggregation type"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={addingAggregationType}
            />
            <button
              onClick={handleAddAggregationType}
              disabled={addingAggregationType || !newAggregationType.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingAggregationType ? 'Adding...' : 'Add'}
            </button>
          </div>

          {/* Aggregation Types List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {aggregationTypes.length === 0 ? (
              <p className="text-gray-500 text-sm">No aggregation types found</p>
            ) : (
              aggregationTypes.map((type, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-800"
                >
                  {type}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
