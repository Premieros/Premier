import type { ReactNode } from 'react';

export function DesignSurface({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId} className="min-w-0 space-y-4">
      {children}
    </section>
  );
}

export function DesignPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header data-testid="design-page-header" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div data-testid="design-page-actions" className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function DesignFilterBar({ children }: { children: ReactNode }) {
  return (
    <div data-testid="design-filter-bar" className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}
