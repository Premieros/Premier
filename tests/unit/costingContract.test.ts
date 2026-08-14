import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ERP-02 Costing Center contract. Locks the page wiring of the Costing Center:
// the three tabs, the four costing RPCs they call, and the route/menu entry.
// Any refactor that renames an RPC, drops a tab, or moves the page entry will
// fail here before a merge is allowed.

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const pageSource = read('src/features/costing/pages/CostingPage.tsx');
const migrationSource = read('supabase/migrations/070_recipe_costing.sql');
const routesSource = read('src/core/navigation/routes.ts');
const menuSource = read('src/core/navigation/menu.config.ts');

const RPCS = ['compute_recipe_cost', 'recipe_costing_report', 'raw_material_cost_history', 'costing_profitability_report'];

describe('Costing Center contract (ERP-02)', () => {
  it('exposes the four costing RPCs in the migration and calls them from the page', () => {
    for (const rpc of RPCS) {
      expect(migrationSource).toContain(`public.${rpc}(`);
      expect(pageSource).toContain(`'${rpc}'`);
    }
  });

  it('provides the three costing tabs', () => {
    for (const testId of ['costing-tab-recipe', 'costing-tab-raw', 'costing-tab-profit']) {
      expect(pageSource).toContain(testId);
    }
  });

  it('renders on its own route gated behind reports.view and the finance menu group', () => {
    expect(routesSource).toContain("costing: '/costing'");
    expect(menuSource).toContain("route: APP_ROUTES.costing");
    expect(menuSource).toContain("permission: 'reports.view'");
    expect(menuSource).toContain("group: 'finance'");
  });

  it('keeps the recipe cost breakdown driven by compute_recipe_cost', () => {
    expect(pageSource).toContain('compute_recipe_cost');
    expect(pageSource).toContain('costing-breakdown-panel');
  });
});
