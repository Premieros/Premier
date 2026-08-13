import { DashboardFoodicsPage } from './DashboardFoodicsPage';

/**
 * Dashboard surface contract.
 *
 * Keep the dashboard's business/data implementation in DashboardFoodicsPage while
 * giving the visual surface a stable semantic boundary. This lets the reference
 * layout evolve without coupling actions/data hooks to DOM placement.
 */
export function DashboardEnhancedPage() {
  return (
    <div data-testid="dashboard-surface" className="min-w-0">
      <div data-testid="dashboard-content" className="mx-auto w-full max-w-[1500px]">
        <DashboardFoodicsPage />
      </div>
    </div>
  );
}
