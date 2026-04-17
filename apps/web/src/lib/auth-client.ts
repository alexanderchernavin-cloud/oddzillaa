'use client';

import {
  authResponseSchema,
  userProfileSchema,
  type AuthResponse,
  type LoginInput,
  type SignupInput,
  type UserProfile,
} from '@oddzilla/shared';
import { apiBaseUrl } from './api-url';

let accessToken: string | null = null;

type AuthChangeListener = () => void;
const listeners: Set<AuthChangeListener> = new Set();

export function onAuthChange(fn: AuthChangeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyAuthChange(): void {
  for (const fn of listeners) fn();
}

function storeAuth(response: AuthResponse): AuthResponse {
  accessToken = response.accessToken;
  return response;
}

async function parseOrThrow<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackMsg;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      if (body?.error?.message) message = body.error.message;
      else if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });
  const data = await parseOrThrow<unknown>(res, 'Signup failed');
  const auth = storeAuth(authResponseSchema.parse(data));
  notifyAuthChange();
  return auth;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });
  const data = await parseOrThrow<unknown>(res, 'Login failed');
  const auth = storeAuth(authResponseSchema.parse(data));
  notifyAuthChange();
  return auth;
}

export async function refresh(): Promise<AuthResponse | null> {
  const res = await fetch(`${apiBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    accessToken = null;
    return null;
  }
  const data = (await res.json()) as unknown;
  return storeAuth(authResponseSchema.parse(data));
}

export async function logout(): Promise<void> {
  if (accessToken) {
    await fetch(`${apiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    }).catch(() => undefined);
  }
  accessToken = null;
  notifyAuthChange();
}

export async function fetchMe(): Promise<UserProfile | null> {
  if (!accessToken) {
    const refreshed = await refresh();
    if (!refreshed) return null;
  }
  const res = await fetch(`${apiBaseUrl()}/api/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
  if (res.status === 401) {
    const refreshed = await refresh();
    if (!refreshed) return null;
    return fetchMe();
  }
  const data = await parseOrThrow<unknown>(res, 'Failed to load profile');
  return userProfileSchema.parse(data);
}

export function getAccessToken(): string | null {
  return accessToken;
}
