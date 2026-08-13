import { useId } from 'react';
import { Search } from 'lucide-react';

export interface DesignSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  testId?: string;
  className?: string;
}

/**
 * Standardized search input (6E contract). Stable `design-search` test id,
 * labelled for accessibility, responsive width, identical visual identity on
 * every list surface. Pure presentational — callers keep their filtering logic.
 */
export function DesignSearch({ value, onChange, placeholder, label, testId = 'design-search', className = '' }: DesignSearchProps) {
  const id = useId();
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id={label ? id : undefined}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        data-testid={testId}
        className="w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </div>
  );
}
