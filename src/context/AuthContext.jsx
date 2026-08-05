import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api';

const STORAGE_KEY = 'GuardrAil-user';
const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE;

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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

  // 시작 시 sessionStorage에 남은 user만 믿지 않고, 토큰이 실제로 유효한지 서버에 확인한다.
  // 만료된 토큰이면 api.js가 refresh를 시도하고, 그것도 실패하면 auth:logout 이벤트로 로그아웃 처리된다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!user || !token) {
        if (user) setUser(null);
        setInitializing(false);
        return;
      }
      try {
        const me = await api.get('/api/users/me');
        if (!cancelled) setUser((prev) => (prev ? { ...prev, ...me } : prev));
      } catch {
        // 네트워크 오류 등 토큰과 무관한 실패는 로그인 상태를 유지한다.
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // accessToken 재발급마저 실패하면(refreshToken 만료 등) lib/api.js가 이 이벤트를 쏜다.
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (loginId, password) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
    } catch {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
    if (res.status === 401) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    if (!res.ok) throw new Error('로그인에 실패했습니다.');
    const data = await res.json();
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    const user = { id: data.userId, name: data.name, role: data.role, loginId };
    setUser(user);
    // gitId, companyName 등 나머지 프로필 정보는 화면 전환을 막지 않고 백그라운드에서 채운다.
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    })
      .then((meRes) => (meRes.ok ? meRes.json() : null))
      .then((me) => {
        if (me) setUser((prev) => (prev ? { ...prev, ...me } : prev));
      })
      .catch(() => {});
    return user;
  }, []);

  const signup = useCallback(async ({ loginId, password, confirm, name, companyName, gitId }) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password, passwordConfirm: confirm, name, companyName, gitId }),
    });
    } catch {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '회원가입에 실패했습니다.');
    }
    return res.json();
  }, []);

  const logout = useCallback(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    // user를 먼저 지워야 페이지 전환이 즉시 반영된다. 백엔드 로그아웃 호출 결과는 기다릴 필요 없다.
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    if (token) {
      fetch(`${API_BASE}/api/users/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const persistUser = useCallback(
      async (updates) => {
        if (!user) return;
        const saved = await api.patch(`/api/users/me`, updates);
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
