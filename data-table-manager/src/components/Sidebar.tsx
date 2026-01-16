import React, { useState } from 'react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-gray-100 border-r border-gray-200 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-200 flex items-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-700"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          ☰
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* XREF Section */}
        <div className="mb-6">
          {!isCollapsed && <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">XREF</h3>}
          
          <div className={isCollapsed ? 'space-y-1' : 'ml-4 space-y-1'}>
            <button
              onClick={() => onNavigate('data-entries')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'data-entries'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
              title="Manage"
            >
              <span className="text-lg">📝</span>
              {!isCollapsed && <span className="text-sm">Manage</span>}
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div>
          {!isCollapsed && <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Settings</h3>}
          
          <div className={isCollapsed ? 'space-y-1' : 'ml-4 space-y-1'}>
            <button
              onClick={() => onNavigate('config')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'config'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
              title="Config"
            >
              <span className="text-lg">🔧</span>
              {!isCollapsed && <span className="text-sm">Config</span>}
            </button>
            <button
              onClick={() => onNavigate('user-management')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-gray-200 ${
                currentPage === 'user-management'
                  ? 'text-primary font-bold'
                  : 'text-gray-700'
              }`}
              title="User Management"
            >
              <span className="text-lg">👥</span>
              {!isCollapsed && <span className="text-sm">User Management</span>}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};
