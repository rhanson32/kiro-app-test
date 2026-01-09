// Authentication service interface and implementation

import { AuthUser, AuthSession, AuthError, EntraIdConfig } from '../types/Auth';

export interface IAuthService {
  // Authentication methods
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthSession>;
  
  // Session management
  getCurrentUser(): AuthUser | null;
  getCurrentSession(): AuthSession | null;
  isAuthenticated(): boolean;
  
  // Token management
  getAccessToken(): string | null;
  validateToken(token: string): Promise<boolean>;
}

export class AuthService implements IAuthService {
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;
  private entraConfig: EntraIdConfig;

  constructor(config: EntraIdConfig) {
    this.entraConfig = config;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    // Implementation will be added in task 2
    throw new Error('Login implementation pending - will be implemented in task 2');
  }

  async logout(): Promise<void> {
    // Implementation will be added in task 2
    this.currentUser = null;
    this.currentSession = null;
  }

  async refreshToken(): Promise<AuthSession> {
    // Implementation will be added in task 2
    throw new Error('Refresh token implementation pending - will be implemented in task 2');
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null && 
           this.currentSession.expiresAt > new Date();
  }

  getAccessToken(): string | null {
    return this.currentSession?.accessToken || null;
  }

  async validateToken(token: string): Promise<boolean> {
    // Implementation will be added in task 2
    return false;
  }
}

// Export singleton instance
export const authService = new AuthService({
  clientId: process.env.REACT_APP_ENTRA_CLIENT_ID || '',
  authority: process.env.REACT_APP_ENTRA_AUTHORITY || '',
  redirectUri: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000',
  scopes: ['openid', 'profile', 'email', 'User.Read']
});