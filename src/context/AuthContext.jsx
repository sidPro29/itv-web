import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch((import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api') + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.msg || 'Login failed');
    }

    if (data.requires2FA) {
      return data; // e.g. { requires2FA: true, email: ... }
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setCurrentUser(data.user);
    return data.user;
  };

  const verify2FA = async (email, code) => {
    const response = await fetch((import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api') + '/auth/verify-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.msg || 'Verification failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setCurrentUser(data.user);
    return data.user;
  };

  const signup = async (username, email, password) => {
    const response = await fetch((import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api') + '/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.msg || 'Signup failed');
    }

    // After signup, we directly log them in using the returned token/user
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setCurrentUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/users/me', {
        headers: {
          'x-auth-token': token
        }
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data));
        setCurrentUser(data);
        return data;
      }
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    login,
    verify2FA,
    signup,
    logout,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
