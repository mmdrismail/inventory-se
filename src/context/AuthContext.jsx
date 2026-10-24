import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, ROLE_PERMISSIONS } from '../services/authService';
import { storageService, STORAGE_KEYS } from '../services/storageService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure seed data initialized before session read
    storageService.initializeSeedData();
    const session = authService.getCurrentUser();
    if (session) {
      setCurrentUser(session);
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const res = authService.login(email, password);
    if (res.success) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const demoLogin = (role) => {
    const res = authService.demoLogin(role);
    if (res.success) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const register = (userData) => {
    const res = authService.register(userData);
    if (res.success) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const forgotPassword = (email) => {
    return authService.forgotPassword(email);
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const hasPermission = (permissionKey) => {
    if (!currentUser) return false;
    return authService.hasPermission(currentUser.role, permissionKey);
  };

  const updateProfile = (updates) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    authService.setCurrentUser(updated);
    setCurrentUser(updated);

    // Also update in users list if present
    const users = storageService.getItem(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      storageService.setItem(STORAGE_KEYS.USERS, users);
    }
  };

  const value = {
    currentUser,
    role: currentUser?.role || null,
    isAuthenticated: Boolean(currentUser),
    loading,
    login,
    demoLogin,
    register,
    forgotPassword,
    logout,
    hasPermission,
    updateProfile,
    permissions: currentUser?.role ? ROLE_PERMISSIONS[currentUser.role] : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
