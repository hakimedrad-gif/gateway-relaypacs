import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AUTH_TOKEN_KEY = 'relaypacs_auth_token';
const REFRESH_TOKEN_KEY = 'relaypacs_refresh_token';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    return {
      token: savedToken,
      username: null, // Could parse from JWT if needed
      isAuthenticated: !!savedToken,
    };
  });

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      const { access_token, refresh_token } = response.data;
      sessionStorage.setItem(AUTH_TOKEN_KEY, access_token);
      if (refresh_token) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      setAuthState({
        token: access_token,
        username,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;
      sessionStorage.setItem(AUTH_TOKEN_KEY, access_token);
      if (refresh_token) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      setAuthState({
        token: access_token,
        username,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

    // Call backend logout endpoint to revoke token
    if (token) {
      try {
        await axios.post(`${API_BASE_URL}/auth/logout`, { token });
      } catch (error) {
        console.warn('Logout endpoint failed, continuing with local cleanup:', error);
      }
    }

    // Clear tokens from sessionStorage
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);

    setAuthState({
      token: null,
      username: null,
      isAuthenticated: false,
    });
  }, []);

  // Interceptor to handle 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  return {
    ...authState,
    login,
    register,
    logout,
  };
};
