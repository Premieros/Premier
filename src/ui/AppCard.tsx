import type { HTMLAttributes, ReactNode } from 'react';

export function AppCard({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`ui-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AppCardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-navy-800 ${className}`} {...props}>{children}</div>;
}

export function AppCardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`p-5 ${className}`} {...props}>{children}</div>;
}
