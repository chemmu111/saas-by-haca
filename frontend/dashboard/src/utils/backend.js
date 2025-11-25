const ENV_BACKEND =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_BACKEND_URL) ||
  (typeof window !== 'undefined'
    ? window.location.origin.replace(/:\d+$/, ':5000')
    : 'http://localhost:5000');

export function getBackendUrl() {
  return ENV_BACKEND.replace(/\/+$/, '');
}

export async function fetchFromBackend(path, options = {}) {
  const url = `${getBackendUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('auth_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response;
}

