// Authentication-related type definitions

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  lastLogin: Date;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthSession {
  user: AuthUser;
  isAuthenticated?: boolean;
  expiresAt: Date;
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
}

export interface AuthError {
  code: string;
  message: string;
  name?: string;
  details?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
}

// Entra ID specific types
export interface EntraIdConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export interface EntraIdTokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}