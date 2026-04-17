'use client';

import { type InputHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="rounded-sm border border-border bg-surface p-6">{children}</div>
      {footer ? <p className="text-center text-xs text-muted">{footer}</p> : null}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
      {error ? <span className="block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm',
        'outline-none transition-colors',
        'focus:border-fg',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

export function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={[
        'relative flex w-full items-center justify-center rounded-sm border border-fg bg-fg',
        'px-4 py-2 text-sm text-bg transition-colors',
        'hover:bg-transparent hover:text-fg disabled:opacity-60',
      ].join(' ')}
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        children
      )}
    </button>
  );
}
