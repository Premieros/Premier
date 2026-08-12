import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = join(dir, entry.name);
  if (entry.name === 'node_modules' || entry.name === 'dist') return [];
  if (entry.isDirectory()) return sourceFiles(full);
  return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
});

describe('navigation regressions', () => {
  it('keeps dashboard KPI and report links mapped to intended destinations', () => {
    const source = read('src/features/dashboard/pages/DashboardFoodicsPage.tsx');
    expect(source).toContain('to="/reports?reportType=sales"');
    expect(source).toContain('to="/reports?reportType=sales_by_payment"');
    expect(source).toContain('to="/reports?reportType=sales_by_product"');
    expect(source).toContain('to="/reports?reportType=detailed_invoices"');
    expect(source).toContain('to="/inventory"');
    expect(source).toContain('setCompareEnabled');
    expect(source).toContain('setFilterOpen');
    expect(source).not.toContain('to="/reports?reportType=sales_by_branch"');
    expect(source).not.toContain('to="/pos/active"');
  });

  it('keeps the POS bottom bar dedicated to active orders', () => {
    const source = read('src/features/pos/components/bottom/OrderTypeBottomBar.tsx');
    expect(source).toContain("aria-label={ar ? 'الطلبات النشطة' : 'Active orders'}");
    expect(source).toContain("setOrdersOpen(true)");
    expect(source).not.toContain('onSelect(type)');
  });

  it('uses one shared Foodics-style application shell for protected screens', () => {
    const layout = read('src/components/Layout.tsx');
    const chrome = read('src/features/dashboard/components/DashboardChrome.tsx');
    expect(layout).toContain("to:'/dashboard'");
    expect(layout).toContain("to:'/products'");
    expect(layout).toContain("to:'/inventory'");
    expect(layout).toContain("to:'/reports'");
    expect(layout).toContain("to:'/settings'");
    expect(layout).toContain("navigate('/floor-plan')");
    expect(layout).toContain("user?.role==='super_admin'");
    expect(chrome).toContain('return <>{children}</>');
    expect(chrome).not.toContain('fixed inset-0 z-[45]');
  });

  it('keeps legacy navigation aliases backed by real protected destinations', () => {
    const routes = read('src/app/routes.tsx');
    expect(routes).toContain('path="/kitchen"');
    expect(routes).toContain('path="/tables"');
    expect(routes).toContain('path="/accounting"');
    expect(routes).toContain('path="/employees"');
    expect(routes).toContain('to="/pos"');
    expect(routes).toContain('to="/floor-plan"');
    expect(routes).toContain('to="/financial-reports"');
    expect(routes).toContain('to="/users"');
  });

  it('rejects obvious dead navigation placeholders across the application', () => {
    const files = sourceFiles(resolve(root, 'src'));
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (/href\s*=\s*["']#|to\s*=\s*["']#|javascript:/i.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
