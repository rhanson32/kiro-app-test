import React from 'react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  entryName?: string;
  isProcessing?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onDeactivate,
  onDelete,
  entryName,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-gray-200">
          <h2 className="m-0 text-xl font-semibold text-gray-800">Confirm Action</h2>
        </div>
        
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-base text-gray-700 m-0 mb-3 font-medium">
            What would you like to do with this entry?
          </p>
          {entryName && (
            <p className="text-sm text-gray-600 m-0 mb-4 px-3 py-2 bg-gray-50 rounded font-mono">
              {entryName}
            </p>
          )}
          <p className="text-sm text-gray-600 m-0">
            <strong>Deactivate:</strong> Mark as inactive (can be reactivated later)
          </p>
          <p className="text-sm text-red-500 m-0 mt-2 font-medium">
            <strong>Delete:</strong> Permanently remove (cannot be undone)
          </p>
        </div>
        
        <div className="flex justify-end gap-3 px-8 py-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onDeactivate}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all border-none bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Deactivate'}
          </button>
          <button
            onClick={onDelete}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all border-none bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
