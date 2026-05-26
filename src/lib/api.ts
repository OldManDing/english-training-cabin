export const AUTH_TOKEN_STORAGE_KEY = 'english-training-cabin:saas-token';
export const AUTH_STATE_CHANGE_EVENT = 'english-training-cabin:auth-state-change';

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string, notify = true) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  if (notify) emitAuthStateChange(true);
}

export function clearStoredAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  emitAuthStateChange(false);
}

export function emitAuthStateChange(authenticated: boolean) {
  window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGE_EVENT, {
    detail: { authenticated },
  }));
}

export async function apiFetch(path: string, options: RequestInit = {}, token = getStoredAuthToken()): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401 && token === getStoredAuthToken()) {
    clearStoredAuthToken();
  }

  return response;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await apiFetch(path, options, token ?? getStoredAuthToken());
  const text = await response.text();
  const payload = text ? JSON.parse(text) as { message?: string } : null;

  if (!response.ok) {
    throw new Error(payload?.message || `请求失败：${response.status}`);
  }

  return payload as T;
}
