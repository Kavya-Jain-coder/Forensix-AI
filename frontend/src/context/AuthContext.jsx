import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('forensix_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const form = new URLSearchParams({ username, password });
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('forensix_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('forensix_token');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, loading, apiBase: API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const canGenerate = (user) => ['admin', 'forensic_officer'].includes(user?.role);
export const canReview = (user) => ['admin', 'reviewer'].includes(user?.role);
export const canUpload = (user) => ['admin', 'forensic_officer', 'investigator'].includes(user?.role);
export const isAdmin = (user) => user?.role === 'admin';
