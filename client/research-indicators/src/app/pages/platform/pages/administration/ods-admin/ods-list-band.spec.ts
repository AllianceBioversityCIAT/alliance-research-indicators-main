import { readFileSync } from 'fs';
import { join } from 'path';

// @akili-spec institutional-performance/strategy-framework B-10 / D-STF-44.
// jsdom cannot judge position: sticky (KZ-017). Each assertion reads one rule,
// cut at that rule's closing brace.

const odsAdmin = __dirname;
const partial = readFileSync(join(odsAdmin, 'ods-list-band.scss'), 'utf8');

const rule = (source: string, selector: string): string => {
  const start = source.indexOf(selector);
  return source.slice(start, source.indexOf('}', start) + 1);
};

const bandHosts = ['framework/framework.component.scss', 'institutional-objectives/institutional-objectives.component.scss'];

describe('ods list band', () => {
  it('sticks the count line and the find row to the top of the list slot', () => {
    const band = rule(partial, '.list-band {');

    expect(band).toContain('position: sticky');
    expect(band).toContain('top: 0');
    expect(band).toContain('z-index: 5');
    expect(band).toContain('background: var(--ac-white-1)');
    expect(band).toContain('padding: 16px 16px 12px');
    expect(band).not.toContain('.ods-find');
    expect(band.endsWith('}')).toBe(true);
  });

  it('scrolls a paddingless box whose first child is the band', () => {
    const scroll = rule(partial, '.list-scroll {');
    expect(scroll).toContain('overflow-y: auto');
    expect(scroll).toContain('padding: 0');
    expect(scroll.endsWith('}')).toBe(true);

    const layout = readFileSync(join(odsAdmin, 'side-panel-layout/side-panel-layout.component.scss'), 'utf8');
    const list = rule(layout, '.side-panel-layout__list {');
    expect(list).toContain('overflow: hidden');
    expect(list).not.toContain('overflow-y: auto');
    expect(list.endsWith('}')).toBe(true);
  });

  it('stops sticking below 1024px so the band does not use the platform scroller', () => {
    const start = partial.indexOf('@media (max-width: 1023px)');
    const bandAt = partial.indexOf('.list-band {', start);
    const band = partial.slice(bandAt, partial.indexOf('}', bandAt) + 1);

    expect(start).toBeGreaterThan(-1);
    expect(band).toContain('position: static');
    expect(band.endsWith('}')).toBe(true);
    expect(band).not.toContain('position: sticky');
  });

  it('is included by the pages that paint the list band', () => {
    for (const file of bandHosts) {
      const source = readFileSync(join(odsAdmin, file), 'utf8');
      expect(source).toContain('ods-list-band');
    }
  });
});
