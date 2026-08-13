import { type ReactNode } from 'react';

/**
 * Dashboard content adapter.
 *
 * The application shell is provided by Layout. This compatibility wrapper
 * keeps dashboard variants passthrough so the shared shell remains the only
 * navigation/overlay surface (nav/shell contract).
 */
export interface DashboardChromeProps {
  children: ReactNode;
  activeTab?: 'general' | 'branches' | 'inventory' | 'kitchen';
}

export function DashboardChrome({ children }: DashboardChromeProps) {
  return <>{children}</>;
}
