import type { ReactNode } from 'react';

export function DesignPanel({ children, testId = 'design-panel' }: { children: ReactNode; testId?: string }) {
  return <section data-testid={testId} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">{children}</section>;
}

export function DesignEmptyState({ children, testId = 'design-empty-state' }: { children: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-navy-800">{children}</div>;
}

export function DesignLoadingState({ children, testId = 'design-loading-state' }: { children?: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="flex min-h-32 items-center justify-center rounded-lg border border-slate-200 p-6 text-sm text-slate-400 dark:border-navy-800">{children ?? 'Loading…'}</div>;
}

export function DesignErrorState({ children, testId = 'design-error-state' }: { children: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">{children}</div>;
}
