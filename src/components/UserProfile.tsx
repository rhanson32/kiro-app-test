import React, { useEffect, useState } from 'react';
import { authService } from '../services/AuthService';
import { AuthUser } from '../types/Auth';
import Logout from './Logout';
import './UserProfile.css';

interface UserProfileProps {
  onLogout?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onLogout }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="user-profile loading">Loading user...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
      <Logout 
        onLogoutSuccess={onLogout}
        className="logout-button"
      />
    </div>
  );
};

export default UserProfile;
