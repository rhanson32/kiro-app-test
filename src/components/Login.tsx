import React, { useState } from 'react';
import { authService } from '../services/AuthService';
import './Login.css';

interface LoginProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: Error) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoginError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEntraIdLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.loginWithEntraId();
      onLoginSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onLoginError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Data Table Manager</h1>
        <p className="login-subtitle">Sign in to access your data</p>
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          className="login-button"
          onClick={handleEntraIdLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Entra ID'}
        </button>

        <p className="login-footer">
          Secure authentication powered by Microsoft Entra ID
        </p>
      </div>
    </div>
  );
};

export default Login;
