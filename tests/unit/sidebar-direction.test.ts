import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('sidebar direction contract', () => {
  it('pins the RTL sidebar to the physical right edge', () => {
    const css = read('src/index.css');
    expect(css).toContain("[data-testid='app-shell'][dir='rtl'] [data-testid='app-sidebar']");
    expect(css).toMatch(/\[data-testid='app-shell'\]\[dir='rtl'\]\s+\[data-testid='app-sidebar'\][\s\S]*?right:\s*0;/);
    expect(css).toMatch(/\[data-testid='app-shell'\]\[dir='rtl'\]\s+\[data-testid='app-sidebar'\][\s\S]*?left:\s*auto;/);
  });

  it('pins the LTR sidebar to the physical left edge', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/\[data-testid='app-shell'\]\[dir='ltr'\]\s+\[data-testid='app-sidebar'\][\s\S]*?left:\s*0;/);
    expect(css).toMatch(/\[data-testid='app-shell'\]\[dir='ltr'\]\s+\[data-testid='app-sidebar'\][\s\S]*?right:\s*auto;/);
  });

  it('keeps the shared shell direction source on the Layout root', () => {
    const layout = read('src/components/Layout.tsx');
    expect(layout).toContain('<div dir={ar ? \'rtl\' : \'ltr\'}');
    expect(layout).toContain('data-testid="app-sidebar"');
    expect(layout).toContain('lg:translate-x-0');
  });
});
