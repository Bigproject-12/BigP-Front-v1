const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8081';

export const TOKEN_KEY = 'GuardrAil-token';
export const REFRESH_TOKEN_KEY = 'GuardrAil-refresh-token';

function clearAuthStorage() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event('auth:logout'));
}

// accessToken 만료(401) 시 refreshToken으로 토큰을 재발급받는다. 성공하면 새 토큰을 저장한다.
async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/users/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// accessToken 자체가 문제인 401만 재발급 대상으로 삼는다 (WRONG_PASSWORD 등 業務 401과 구분).
const TOKEN_ERROR_CODES = new Set(['EXPIRED_TOKEN', 'INVALID_TOKEN', 'LOGIN_REQUIRED']);

async function request(path, options = {}, isRetry = false) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  //formdata인지 판별
  const isFormData = options.body instanceof FormData;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        // 💡 FormData가 아닐 때만 'Content-Type': 'application/json'을 추가합니다.
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`API 서버(${API_BASE})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    if (res.status === 401 && !isRetry && TOKEN_ERROR_CODES.has(body?.code) && sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return request(path, options, true);
      clearAuthStorage();
      throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }

    throw new Error(body?.message ?? `요청에 실패했습니다 (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  
  // 💡 body가 FormData라면 JSON.stringify를 하지 않고 통째로 넘깁니다.
  post: (path, body) => request(path, { 
    method: 'POST', 
    body: body instanceof FormData ? body : JSON.stringify(body) 
  }),
  
  patch: (path, body) => request(path, { 
    method: 'PATCH', 
    body: body instanceof FormData ? body : JSON.stringify(body) 
  }),
  
  put: (path, body) => request(path, { 
    method: 'PUT', 
    body: body instanceof FormData ? body : JSON.stringify(body) 
  }),
  
  del: (path, body) => request(path, { 
    method: 'DELETE', 
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) 
  }),
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

