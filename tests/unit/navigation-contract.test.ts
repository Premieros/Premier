import { describe, expect, it } from 'vitest';
import { APP_ROUTES } from '@/core/navigation/routes';
import { MENU_ITEMS } from '@/core/navigation/menu.config';

describe('navigation contract', () => {
  it('keeps route identifiers unique', () => {
    const routeValues = Object.values(APP_ROUTES);
    expect(new Set(routeValues).size).toBe(routeValues.length);
  });

  it('keeps menu identities unique and stable', () => {
    const ids = MENU_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every menu target anchored to the canonical route map', () => {
    const canonicalRoutes = new Set(Object.values(APP_ROUTES));
    for (const item of MENU_ITEMS) {
      expect(canonicalRoutes.has(item.route), `${item.id} points outside APP_ROUTES`).toBe(true);
    }
  });

  it('keeps menu permissions explicit for protected navigation items', () => {
    const publicMenuIds = new Set(['subscription']);
    for (const item of MENU_ITEMS) {
      if (item.superAdminOnly || publicMenuIds.has(item.id)) continue;
      expect(item.permission, `${item.id} is missing a navigation permission`).toBeTruthy();
    }
  });
});
