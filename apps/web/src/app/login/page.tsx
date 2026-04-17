'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginInputSchema } from '@oddzilla/shared';
import { login } from '@/lib/auth-client';
import { AuthFormShell, Field, Input, SubmitButton } from '@/components/auth-form';

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = loginInputSchema.safeParse(state);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data);
      router.push('/');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="underline underline-offset-4 hover:text-fg">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={state.email}
            autoComplete="email"
            onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <Input
            type="password"
            value={state.password}
            autoComplete="current-password"
            onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
          />
        </Field>
        {serverError ? (
          <p className="text-sm text-red-400" role="alert">
            {serverError}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <SubmitButton submitting={submitting}>Sign in</SubmitButton>
      </form>
    </AuthFormShell>
  );
}
