import { type ButtonHTMLAttributes, type ReactNode, useRef, type MouseEvent } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  ripple?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-navy-900 hover:bg-navy-800 text-white shadow-sm shadow-navy-900/20 active:bg-navy-950 ring-1 ring-navy-800/50',
  secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:bg-red-800',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  outline: 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:bg-emerald-800',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:bg-amber-700',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', children, className = '', ripple = true, type = 'button', onClick, ...props }: ButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (ripple && btnRef.current) {
      const btn = btnRef.current;
      const rect = btn.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.className = 'absolute rounded-full bg-white/30 pointer-events-none animate-ripple';
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }
    onClick?.(e);
  };

  return (
    <button
      ref={btnRef}
      type={type}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
