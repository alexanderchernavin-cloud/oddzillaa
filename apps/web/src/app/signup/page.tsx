'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signupInputSchema } from '@oddzilla/shared';
import { signup } from '@/lib/auth-client';
import { AuthFormShell, Field, Input, SubmitButton } from '@/components/auth-form';

export default function SignupPage() {
  const router = useRouter();
  const [state, setState] = useState({ email: '', password: '', displayName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = signupInputSchema.safeParse(state);
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
      await signup(parsed.data);
      router.push('/');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      title="Create account"
      subtitle="Create your account to start betting."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="underline underline-offset-4 hover:text-fg">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Display name" error={errors.displayName}>
          <Input
            value={state.displayName}
            autoComplete="nickname"
            onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
          />
        </Field>
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
            autoComplete="new-password"
            onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
          />
        </Field>
        {serverError ? (
          <p className="text-sm text-red-400" role="alert">
            {serverError}
          </p>
        ) : null}
        <SubmitButton submitting={submitting}>Create account</SubmitButton>
      </form>
    </AuthFormShell>
  );
}
