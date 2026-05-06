import {
  communityFeedDto,
  communityMeDto,
  communityProfileDto,
  profileTicketsDto,
  type CommunityFeedDto,
  type CommunityMeDto,
  type CommunityProfileDto,
  type ProfileTicketsDto,
  type UpdateCommunityProfileInput,
} from '@oddzilla/shared';
import { apiBaseUrl } from './api-url';

async function get<T>(path: string, parse: (data: unknown) => T): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}/api${path}`, {
    next: { revalidate: 0 },
  });
  if (res.status === 404) {
    throw new Error('NOT_FOUND');
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  return parse(data);
}

export async function getCommunityProfile(nickname: string): Promise<CommunityProfileDto> {
  return get(`/community/users/${encodeURIComponent(nickname)}/profile`, (d) =>
    communityProfileDto.parse(d),
  );
}

export async function getCommunityProfileTickets(
  nickname: string,
  page = 1,
  pageSize = 10,
): Promise<ProfileTicketsDto> {
  return get(
    `/community/users/${encodeURIComponent(nickname)}/tickets?page=${page}&pageSize=${pageSize}`,
    (d) => profileTicketsDto.parse(d),
  );
}

export async function getCommunityFeed(opts: {
  sortBy?: 'recent';
  sportId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<CommunityFeedDto> {
  const params = new URLSearchParams();
  if (opts.sortBy) params.set('sort', opts.sortBy);
  if (opts.sportId) params.set('sportId', opts.sportId);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString();
  return get(`/community/feed${qs ? '?' + qs : ''}`, (d) => communityFeedDto.parse(d));
}

function authedHeaders(token: string | null): Record<string, string> {
  return token
    ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
}

export async function getCommunityMe(token: string | null): Promise<CommunityMeDto | null> {
  if (!token) return null;
  const res = await fetch(`${apiBaseUrl()}/api/community/me`, {
    headers: authedHeaders(token),
    credentials: 'include',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to load community profile');
  return communityMeDto.parse(await res.json());
}

export async function updateVisibility(
  token: string | null,
  ticketsPublic: boolean,
): Promise<CommunityMeDto> {
  const res = await fetch(`${apiBaseUrl()}/api/community/me/visibility`, {
    method: 'PATCH',
    headers: authedHeaders(token),
    credentials: 'include',
    body: JSON.stringify({ ticketsPublic }),
  });
  if (!res.ok) throw new Error('Failed to update visibility');
  return communityMeDto.parse(await res.json());
}

export async function updateCommunityProfile(
  token: string | null,
  input: UpdateCommunityProfileInput,
): Promise<CommunityMeDto> {
  const res = await fetch(`${apiBaseUrl()}/api/community/me/profile`, {
    method: 'PATCH',
    headers: authedHeaders(token),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (res.status === 409) {
    throw new Error('Nickname is already taken');
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? 'Failed to update profile');
  }
  return communityMeDto.parse(await res.json());
}
