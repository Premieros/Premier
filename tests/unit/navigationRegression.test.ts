import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('navigation regressions', () => {
  it('keeps dashboard financial KPI links mapped to their intended reports', () => {
    const source = read('src/features/dashboard/pages/DashboardFoodicsPage.tsx');
    expect(source).toContain('to="/reports?reportType=sales"');
    expect(source).toContain('to="/reports?reportType=expenses"');
    expect(source).toContain('to="/reports?reportType=profit"');
    expect(source).toContain('to="/reports?reportType=detailed_invoices"');
    expect(source).toContain('to="/reports?reportType=low_stock"');
    expect(source).not.toContain('to="/pos/active"');
  });

  it('keeps the POS bottom bar dedicated to active orders', () => {
    const source = read('src/features/pos/components/bottom/OrderTypeBottomBar.tsx');
    expect(source).toContain("aria-label={ar ? 'الطلبات النشطة' : 'Active orders'}");
    expect(source).toContain("setOrdersOpen(true)");
    expect(source).not.toContain('onSelect(type)');
  });
});
