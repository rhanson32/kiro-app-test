// Authentication service implementation using AWS Amplify v6

import { 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
  signInWithRedirect,
  AuthUser as AmplifyAuthUser
} from 'aws-amplify/auth';
import { AuthUser, AuthSession, AuthError } from '../types/Auth';

export interface IAuthService {
  // Authentication methods
  loginWithEntraId(): Promise<void>;
  logout(): Promise<void>;
  
  // Session management
  getCurrentUser(): Promise<AuthUser | null>;
  getCurrentSession(): Promise<AuthSession | null>;
  isAuthenticated(): Promise<boolean>;
  
  // Token management
  getAccessToken(): Promise<string | null>;
}

export class AuthService implements IAuthService {
  /**
   * Initiates login flow with Entra ID via OAuth redirect
   */
  async loginWithEntraId(): Promise<void> {
    try {
      await signInWithRedirect({
        provider: { custom: 'EntraID' }
      });
    } catch (error) {
      console.error('Login with Entra ID failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Signs out the current user and clears session
   */
  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Gets the currently authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await getCurrentUser();
      return this.mapAmplifyUserToAuthUser(user);
    } catch (error) {
      // User not authenticated
      return null;
    }
  }

  /**
   * Gets the current authentication session
   */
  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens) {
        return null;
      }

      const user = await this.getCurrentUser();
      
      return {
        accessToken: session.tokens.accessToken.toString(),
        idToken: session.tokens.idToken?.toString() || '',
        refreshToken: '', // Refresh token is handled internally by Amplify
        expiresAt: new Date(session.tokens.accessToken.payload.exp! * 1000),
        user: user!
      };
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Checks if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return session !== null && session.expiresAt > new Date();
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken.toString() || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Maps Amplify user to our AuthUser type
   */
  private mapAmplifyUserToAuthUser(amplifyUser: AmplifyAuthUser): AuthUser {
    return {
      id: amplifyUser.userId,
      email: amplifyUser.signInDetails?.loginId || '',
      name: amplifyUser.username,
      roles: [], // Roles would come from token claims
      lastLogin: new Date()
    };
  }

  /**
   * Handles authentication errors and converts to AuthError
   */
  private handleAuthError(error: any): AuthError {
    const authError: AuthError = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown authentication error occurred',
      name: error.name || 'AuthError'
    };
    return authError;
  }
}

// Export singleton instance
export const authService = new AuthService();