import type { AuthResponse, ValidationDetail } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
let csrfToken: string | undefined;

type ApiErrorPayload = {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: ValidationDetail[];
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ValidationDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  csrfProtected = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (csrfProtected) headers.set('X-CSRF-Token', await getCsrfToken());

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(
      response.status,
      payload.code ?? `HTTP_${response.status}`,
      payload.message ?? 'The request could not be completed.',
      payload.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await apiRequest<{ csrfToken: string }>('/auth/csrf');
  csrfToken = response.csrfToken;
  return csrfToken;
}

export function getCurrentUser(): Promise<AuthResponse> {
  return apiRequest('/auth/me');
}

export function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(input) }, true);
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(input) }, true);
}

export function refreshSession(): Promise<AuthResponse> {
  return apiRequest('/auth/refresh', { method: 'POST' }, true);
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' }, true);
  } finally {
    csrfToken = undefined;
  }
}
