import { apiBaseUrl } from './api-url';
import type { MatchDto, SportDto } from '@oddzilla/shared';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}/api${path}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getSports(): Promise<SportDto[]> {
  return get<SportDto[]>('/sports');
}

export async function getMatches(status?: 'live' | 'scheduled' | 'finished'): Promise<MatchDto[]> {
  const qs = status ? `?status=${status}` : '';
  return get<MatchDto[]>(`/matches${qs}`);
}

export async function getMatch(id: string): Promise<MatchDto> {
  return get<MatchDto>(`/matches/${id}`);
}
