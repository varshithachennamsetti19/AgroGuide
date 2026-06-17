import React, { createContext, useState, useEffect, useContext } from 'react';
import { getMe, loginUser, registerUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in (verify token in cookie) on mount
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const response = await getMe();
        if (response.success && response.user) {
          setUser(response.user);
        }
      } catch (err) {
        // Session verify fail is normal if not logged in
        console.log('No active session found on mount:', err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (name, email, password, preferredLanguage) => {
    setError(null);
    setLoading(true);
    try {
      const response = await registerUser(name, email, password, preferredLanguage);
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Logout failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
