const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8081';

export const TOKEN_KEY = 'GuardrAil-token';

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`API 서버(${API_BASE})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`);
  }
  if (!res.ok) {
    throw new Error(`요청에 실패했습니다 (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export { API_BASE };