import { type ReactNode } from 'react';
import { DesignSurface } from '@/components/design/DesignSurface';

/**
 * Dashboard content adapter.
 *
 * The application shell is provided by Layout. This compatibility wrapper
 * now also establishes one stable, responsive design surface for all
 * dashboard variants without changing their data fetching or behavior.
 */
export interface DashboardChromeProps {
  children: ReactNode;
  activeTab?: 'general' | 'branches' | 'inventory' | 'kitchen';
}

export function DashboardChrome({ children }: DashboardChromeProps) {
  return <DesignSurface testId="dashboard-surface">{children}</DesignSurface>;
}
