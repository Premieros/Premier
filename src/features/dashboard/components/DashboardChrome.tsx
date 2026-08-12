import { type ReactNode } from 'react';

/**
 * Dashboard content adapter.
 *
 * The application shell is now provided by Layout so every protected screen
 * shares one navigation/header system. This component intentionally remains
 * as a compatibility wrapper for existing dashboard pages and future
 * dashboard-specific composition without creating a second shell.
 */
export interface DashboardChromeProps {
  children: ReactNode;
  activeTab?: 'general' | 'branches' | 'inventory' | 'kitchen';
}

export function DashboardChrome({ children }: DashboardChromeProps) {
  return <>{children}</>;
}
