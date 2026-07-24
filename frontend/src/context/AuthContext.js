import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { setAuthToken, loginUser, registerUser } from '../services/api';

// Use a simple in-memory store for web, SecureStore for native
let SecureStore = null;

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

// Web-compatible storage fallback
const webStorage = {
  getItemAsync: async (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItemAsync: async (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  deleteItemAsync: async (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

const getStorage = () => {
  if (Platform.OS === 'web') {
    return webStorage;
  }
  // Lazy-load SecureStore only on native
  if (!SecureStore) {
    SecureStore = require('expo-secure-store');
  }
  return SecureStore;
};

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check for stored token
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storage = getStorage();
      const storedToken = await storage.getItemAsync(AUTH_TOKEN_KEY);
      const storedUser = await storage.getItemAsync(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setAuthToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await loginUser({ email, password });
    const { token: newToken, fullName, username, userId } = response;

    setToken(newToken);
    const userData = { fullName, username, email, userId };
    setUser(userData);
    setAuthToken(newToken);

    const storage = getStorage();
    await storage.setItemAsync(AUTH_TOKEN_KEY, newToken);
    await storage.setItemAsync(AUTH_USER_KEY, JSON.stringify(userData));

    return response;
  };

  const register = async (fullName, username, email, password) => {
    const response = await registerUser({ fullName, username, email, password });
    const { token: newToken, userId } = response;

    setToken(newToken);
    const userData = { fullName, username, email, userId };
    setUser(userData);
    setAuthToken(newToken);

    const storage = getStorage();
    await storage.setItemAsync(AUTH_TOKEN_KEY, newToken);
    await storage.setItemAsync(AUTH_USER_KEY, JSON.stringify(userData));

    return response;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);

    const storage = getStorage();
    await storage.deleteItemAsync(AUTH_TOKEN_KEY);
    await storage.deleteItemAsync(AUTH_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
