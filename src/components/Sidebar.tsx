import React from 'react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="bg-gray-100 border-r border-gray-200 w-64 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* XREF Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">XREF</h3>
          
          <div className="ml-4 space-y-1">
            <button
              onClick={() => onNavigate('data-entries')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'data-entries'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
            >
              <span className="text-lg">📝</span>
              <span className="text-sm">Manage</span>
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Settings</h3>
          
          <div className="ml-4 space-y-1">
            <button
              onClick={() => onNavigate('config')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'config'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
            >
              <span className="text-lg">🔧</span>
              <span className="text-sm">Config</span>
            </button>
            <button
              onClick={() => onNavigate('user-management')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'user-management'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
            >
              <span className="text-lg">👥</span>
              <span className="text-sm">User Management</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};
