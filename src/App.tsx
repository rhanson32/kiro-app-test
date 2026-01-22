import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { appConfig } from './config';
import { TableView, Sidebar, ConfigPage } from './components';
import { DataEntry } from './types/DataEntry';

// Custom SSO Login Component
const SSOLogin: React.FC = () => {
  const auth = useAuth();

  const handleSSOLogin = () => {
    // Clear any stale auth state before redirecting
    sessionStorage.clear();
    localStorage.removeItem('oidc.user');
    auth.signinRedirect();
  };

  const handleClearAndRetry = () => {
    // Clear all auth-related storage
    sessionStorage.clear();
    localStorage.clear();
    // Reload the page to start fresh
    window.location.reload();
  };

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-teal-800">
        <div className="bg-white rounded-xl shadow-2xl p-16 max-w-md w-full text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-teal-800 rounded-full animate-spin mb-4 mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    // Check if it's a state mismatch error
    const isStateMismatch = auth.error.message.includes('state') || 
                           auth.error.message.includes('No matching state');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-teal-800">
        <div className="bg-white rounded-xl shadow-2xl p-16 max-w-md w-full text-center">
          <h1 className="text-3xl font-semibold text-gray-800 mb-3">XREF Manager</h1>
          
          {isStateMismatch ? (
            <>
              <p className="text-gray-600 mb-4">Authentication session expired or invalid.</p>
              <p className="text-sm text-gray-500 mb-6">Please try logging in again.</p>
              <button 
                className="w-full px-6 py-4 bg-teal-800 text-white rounded-lg text-base font-semibold hover:bg-teal-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleClearAndRetry}
              >
                Clear Session & Login
              </button>
            </>
          ) : (
            <>
              <p className="text-red-600 mb-2">Authentication Error</p>
              <p className="text-sm text-gray-600 mb-6">{auth.error.message}</p>
              <button 
                className="w-full px-6 py-4 bg-teal-800 text-white rounded-lg text-base font-semibold hover:bg-teal-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleSSOLogin}
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-teal-800">
      <div className="bg-white rounded-xl shadow-2xl p-16 max-w-md w-full text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-3">XREF Manager</h1>
        <p className="text-gray-600 mb-10">Sign in with your organizational account</p>
        <button 
          className="w-full px-6 py-4 bg-teal-800 text-white rounded-lg text-base font-semibold hover:bg-teal-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          onClick={handleSSOLogin}
        >
          Login through SSO
        </button>
      </div>
    </div>
  );
};

function App() {
  const auth = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<DataEntry | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('data-entries');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Lift data state to App level so it persists across page navigation
  const [cachedEntries, setCachedEntries] = useState<DataEntry[]>([]);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  const handleSignOut = () => {
    const clientId = process.env.REACT_APP_USER_POOL_CLIENT_ID;
    const logoutUri = encodeURIComponent(process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000');
    const cognitoDomain = process.env.REACT_APP_OAUTH_DOMAIN;
    window.location.href = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  };

  // Show login if not authenticated
  if (!auth.isAuthenticated) {
    return <SSOLogin />;
  }

  // Show main app when authenticated
  const userEmail = auth.user?.profile?.email || auth.user?.profile?.sub || 'User';
  const userName = auth.user?.profile?.name || userEmail;

  const renderPage = () => {
    switch (currentPage) {
      case 'data-entries':
        return (
          <TableView
            onEntrySelect={(entry) => setSelectedEntry(entry)}
            onEntryEdit={(entry) => console.log('Edit:', entry)}
            onEntryDelete={(entry) => console.log('Delete:', entry)}
            userEmail={userEmail}
            cachedEntries={cachedEntries}
            setCachedEntries={setCachedEntries}
            dataLoaded={dataLoaded}
            setDataLoaded={setDataLoaded}
          />
        );
      case 'config':
        return <ConfigPage />;
      case 'user-management':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-4">User Management</h1>
            <p className="text-gray-600">User management functionality coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h1>
            <p className="text-gray-600">The requested page could not be found.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Full Width */}
      <header className="bg-gray-100 px-6 py-3 flex justify-between items-center shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            ☰
          </button>
          <h1 className="text-xl font-semibold text-gray-800">XREF Manager</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl font-semibold text-white cursor-pointer">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button 
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={sidebarOpen} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;

