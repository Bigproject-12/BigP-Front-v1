import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../lib/api';

const STORAGE_KEY = 'GuardrAil-user';
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toPublicUser(user) {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setInitializing(false);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (loginId, password) => {
    const res = await fetch('http://localhost:8081/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.status === 401) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    if (!res.ok) throw new Error('로그인에 실패했습니다.');
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    const meRes = await fetch('http://localhost:8081/api/users/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const me = meRes.ok ? await meRes.json() : {};
    const user = { id: data.userId, name: data.name, role: data.role, loginId, ...me };
    setUser(user);
    return user;
  }, []);

  const signup = useCallback(async ({ loginId, password, confirm, name, companyName, gitId }) => {
    const res = await fetch('http://localhost:8081/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password, passwordConfirm: confirm, name, companyName, gitId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '회원가입에 실패했습니다.');
    }
    return res.json();
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('http://localhost:8081/api/users/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const persistUser = useCallback(
    async (updates) => {
      if (!user) return;
      const saved = await api.patch(`/users/${user.id}`, updates);
      setUser(toPublicUser(saved));
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, initializing, login, signup, logout, persistUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
