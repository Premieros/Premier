import { VisualDashboardPage } from './VisualDashboardPage';

/**
 * 6H visual rebuild entry point.
 * Business/data concerns remain isolated in the existing hooks/API layer;
 * this component owns the new visual dashboard surface.
 */
export function DashboardEnhancedPage() {
  return <VisualDashboardPage />;
}
