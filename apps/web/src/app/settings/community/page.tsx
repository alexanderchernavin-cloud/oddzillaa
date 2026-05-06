'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Users, ExternalLink } from 'lucide-react';
import { fetchMe, getAccessToken, refresh } from '../../../lib/auth-client';
import {
  getCommunityMe,
  updateCommunityProfile,
  updateVisibility,
} from '../../../lib/community-client';
import type { CommunityMeDto } from '@oddzilla/shared';

export default function CommunitySettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<CommunityMeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      const res = await refresh();
      if (!res) {
        router.push('/login');
        return;
      }
      token = getAccessToken();
    }
    const profile = await fetchMe();
    if (!profile) {
      router.push('/login');
      return;
    }
    const community = await getCommunityMe(getAccessToken());
    setMe(community);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-muted" />
        <h1 className="text-2xl font-semibold">Community profile</h1>
      </div>

      <VisibilitySection me={me} onChange={setMe} />
      <ProfileSection me={me} onChange={setMe} />

      {me.nickname && (
        <div className="rounded border border-border bg-card p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Public profile</p>
          <Link
            href={`/u/${me.nickname}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            View as visitors see it
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

function VisibilitySection({
  me,
  onChange,
}: {
  me: CommunityMeDto;
  onChange: (m: CommunityMeDto) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const next = await updateVisibility(getAccessToken(), !me.ticketsPublic);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    }
    setSaving(false);
  }

  return (
    <section className="rounded border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Public tickets</h2>
          <p className="mt-1 text-xs text-muted">
            When on, your settled tickets appear in the community feed and on your profile.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={me.ticketsPublic}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            me.ticketsPublic ? 'bg-accent' : 'bg-card-hover'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-bg transition-transform ${
              me.ticketsPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}

function ProfileSection({
  me,
  onChange,
}: {
  me: CommunityMeDto;
  onChange: (m: CommunityMeDto) => void;
}) {
  const [nickname, setNickname] = useState(me.nickname ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const next = await updateCommunityProfile(getAccessToken(), {
        nickname: nickname.trim() === '' ? null : nickname.trim(),
        bio: bio.trim() === '' ? null : bio.trim(),
      });
      onChange(next);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
    setSaving(false);
  }

  return (
    <section className="rounded border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            Handle
          </label>
          <div className="flex items-center gap-1">
            <span className="text-muted">@</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              placeholder="yourhandle"
              className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Letters, numbers and underscores only. 3 to 20 characters. Used in your public URL.
          </p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full resize-none rounded border border-border bg-black/30 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-right text-[10px] text-muted">{bio.length}/280</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">Saved</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-accent px-6 py-2 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
