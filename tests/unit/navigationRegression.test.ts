import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('navigation regressions', () => {
  it('keeps dashboard financial KPI links mapped to their intended reports', () => {
    const source = read('src/features/dashboard/pages/DashboardEnhancedPage.tsx');
    expect(source).toContain('href="/reports?reportType=sales"');
    expect(source).toContain('href="/reports?reportType=expenses"');
    expect(source).toContain('href="/reports?reportType=profit"');
    expect(source).toContain('href="/reports?reportType=detailed_invoices"');
    expect(source).toContain('href="/reports?reportType=low_stock"');
    expect(source).not.toContain('href="/pos/active"');
  });

  it('keeps the POS bottom bar dedicated to active orders', () => {
    const source = read('src/features/pos/components/bottom/OrderTypeBottomBar.tsx');
    expect(source).toContain("aria-label={ar ? 'الطلبات النشطة' : 'Active orders'}");
    expect(source).toContain("setOrdersOpen(true)");
    expect(source).not.toContain('onSelect(type)');
  });
});
