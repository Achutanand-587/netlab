const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8000/api/v1';
export const backendConfigured = Boolean(BASE);

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown> | null;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  database: string;
  live_capture_enabled: boolean;
  time: string;
}

export async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('No backend configured. Set VITE_API_BASE_URL in .env (Demo Mode is active).');
  
  const headers = new Headers(init?.headers || {});
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Backend responded with HTTP ${response.status}`;
    try {
      const errJson = (await response.json()) as ApiErrorResponse;
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message;
        if (Array.isArray(errJson.error.details) && errJson.error.details.length > 0) {
          const detailStr = errJson.error.details.map(d => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ');
          errorMsg += ` (${detailStr})`;
        }
      }
    } catch {
      // Fallback to text status if response wasn't JSON
      if (response.statusText) {
        errorMsg = `${response.statusText} (${response.status})`;
      }
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const get = <T>(path: string) => req<T>(path, { method: 'GET' });
export const post = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const del = <T>(path: string) => req<T>(path, { method: 'DELETE' });
export const upload = <T>(path: string, formData: FormData) => req<T>(path, { method: 'POST', body: formData });

export const api = {
  health: () => req<HealthResponse>('/health'),
  subnet: (ip: string, prefix: number) => post('/subnetting/calculate', { ip, prefix }),
  errorDetect: (data: string, algorithm: string) => post('/error-detection/encode', { data, algorithm }),
  bandwidth: (range: string) => req(`/bandwidth?range=${range}`),
  protocol: (name: string) => req(`/protocols/${name}`),
  topology: (graph: unknown) => post('/topology/simulate', graph),
  research: () => req('/research/experiments'),
  get,
  post,
  del,
  upload,
  getBaseUrl: () => BASE,
};
