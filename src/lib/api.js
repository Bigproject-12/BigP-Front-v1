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

export async function deleteAccount(password, token) {
  const response = await fetch('http://localhost:8081/api/users/me', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword: password }), // 백엔드 DTO(AccountDeleteRequest) 형식에 맞춤
  });

  if (!response.ok) {
    throw new Error('회원 탈퇴에 실패했습니다. 비밀번호를 확인해주세요.');
  }
  
  return true;
}


export { API_BASE };

