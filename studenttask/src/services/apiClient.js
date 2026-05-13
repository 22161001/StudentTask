import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from './storageService';
import { unwrapApiData } from './apiMappers';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

const getAuthToken = () => readStorage(STORAGE_KEYS.authToken, '');

const persistAuthToken = (token) => {
  const normalizedToken = String(token ?? '').trim();

  if (!normalizedToken) {
    removeStorage(STORAGE_KEYS.authToken);
    return '';
  }

  writeStorage(STORAGE_KEYS.authToken, normalizedToken);
  return normalizedToken;
};

const clearAuthToken = () => {
  removeStorage(STORAGE_KEYS.authToken);
};

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const extractApiMessage = (payload, fallback = 'No se pudo completar la solicitud.') => {
  const data = unwrapApiData(payload);

  const candidates = [
    payload?.message,
    payload?.error,
    data?.message,
    data?.error,
    typeof payload === 'string' ? payload : '',
  ];

  const message = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return message?.trim() || fallback;
};

const isApiFallbackError = (error) => {
  if (!error || typeof error !== 'object') {
    return true;
  }

  if (!('status' in error)) {
    return true;
  }

  return [404, 405, 500, 502, 503, 504].includes(error.status);
};

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const shouldSerializeBody = options.body !== undefined && !isFormData && headers.get('Content-Type')?.includes('application/json');

  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...options,
    headers,
    body: shouldSerializeBody && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  const contentType = response.headers.get('content-type') ?? '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => '');
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthToken();
      removeStorage(STORAGE_KEYS.session);

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const error = new Error(extractApiMessage(payload, `Error ${response.status}`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return { response, data: payload };
};

export { clearAuthToken, extractApiMessage, getAuthToken, isApiFallbackError, persistAuthToken, request };
