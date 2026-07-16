import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

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

  const login = useCallback(async (email, password) => {
    const matches = await api.get(
      `/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    );
    if (!matches || matches.length === 0) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const publicUser = toPublicUser(matches[0]);
    setUser(publicUser);
    return publicUser;
  }, []);

  const signup = useCallback(async ({ loginId, password, confirm, name, companyName, gitId }) => {
    const res = await fetch('http://localhost:8081/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password, passwordConfirm: confirm, name, companyName, gitId }),
    });
    if (res.status === 404) throw new Error('등록된 회사를 찾을 수 없습니다.');
    if (!res.ok) throw new Error('회원가입에 실패했습니다.');
    return res.json();
  }, []);

  const logout = useCallback(() => {
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
