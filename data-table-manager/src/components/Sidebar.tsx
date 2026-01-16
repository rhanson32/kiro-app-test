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
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && <h2 className="text-lg font-semibold text-gray-800">XREF Manager</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '☰' : '◀'}
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                currentPage === 'data-entries'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-200'
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                currentPage === 'config'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              title="Config"
            >
              <span className="text-lg">🔧</span>
              {!isCollapsed && <span className="text-sm">Config</span>}
            </button>
            <button
              onClick={() => onNavigate('user-management')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                currentPage === 'user-management'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-200'
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
