import React, { useState } from 'react';
import { authService } from '../services/AuthService';

interface LogoutProps {
  onLogoutSuccess?: () => void;
  onLogoutError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Logout: React.FC<LogoutProps> = ({ 
  onLogoutSuccess, 
  onLogoutError,
  className = 'logout-button',
  children = 'Sign out'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await authService.logout();
      onLogoutSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
      onLogoutError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out...' : children}
    </button>
  );
};

export default Logout;
