import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getTokenExpiration, isTokenExpired } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    return savedToken && !isTokenExpired(savedToken) ? savedToken : null;
  });
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken || isTokenExpired(savedToken)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const saveAuth = (tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userVal));
  };

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const expiration = getTokenExpiration(token);
    if (expiration === null) {
      const timer = window.setTimeout(clearAuth, 0);
      return () => window.clearTimeout(timer);
    }

    const timeout = expiration - Date.now();
    if (timeout <= 0) {
      const timer = window.setTimeout(() => {
        clearAuth();
        window.location.replace('/login');
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      clearAuth();
      window.location.replace('/login');
    }, timeout);

    return () => window.clearTimeout(timer);
  }, [token, clearAuth]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    saveAuth(data.token, data.user);
    return data;
  };

  const signup = async (email, password) => {
    const data = await api.signup(email, password);
    saveAuth(data.token, data.user);
    return data;
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token) && !isTokenExpired(token),
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Fast refresh for the provider while exporting the hook in the same module.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
