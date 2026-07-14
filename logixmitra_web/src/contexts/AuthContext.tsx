import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [authError, setAuthError] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading user with token:', token ? 'Token exists' : 'No token');
      
      if (token && token !== 'undefined' && token !== 'null') {
        const initialized = api.initializeToken();
        
        if (initialized) {
          try {
            const response = await api.getCurrentUser();
            console.log('Load user response:', response);
            
            if (response && response.success) {
              setUser(response.data);
              setAuthError(null);
            } else {
              console.warn('Invalid token, removing...');
              api.removeToken();
              setUser(null);
            }
          } catch (apiError) {
            console.error('API get current user failed:', apiError);
            api.removeToken();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') {
        return;
      }

      const response = await api.getAllUsers();
      console.log('Load all users response:', response);
      
      if (response && response.success) {
        setAllUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load users from API:', error);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadAllUsers();
    }
  }, [user, loadAllUsers]);

  const login = async (email, password) => {
    setAuthError(null);
    
    try {
      console.log('AuthContext login attempt:', email);
      
      const response = await api.login(email, password);
      console.log('API login response:', response);
      
      if (response && response.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return { success: true, data: response.data };
      }
      
      return { 
        success: false, 
        error: response?.error || 'Invalid email or password' 
      };
      
    } catch (error) {
      console.error('Login error in context:', error);
      
      if (error.networkError) {
        return { 
          success: false, 
          error: 'Cannot connect to server. Please ensure backend is running.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAllUsers([]);
      api.removeToken();
      localStorage.removeItem('user');
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await loadUser();
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    allUsers,
    refreshUser,
    authError,
    isAuthenticated: !!user,
    isAdmin: true|| user?.role === 'admin',
    isManager: user?.role === 'manager',
    isSupervisor: user?.role === 'supervisor',
    getUserRole: () => user?.role || null,
    getUserPermissions: () => user?.permissions || [],
    hasPermission: (module, action) => {
      if (!user || !user.permissions) return false;
      if (user.role === 'admin') return true;
      
      const modulePerms = user.permissions.find(p => p.module === module);
      return modulePerms ? modulePerms.actions.includes(action) : false;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};