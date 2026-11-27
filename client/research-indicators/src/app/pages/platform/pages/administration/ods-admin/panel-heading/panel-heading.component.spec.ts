import { readFileSync } from 'fs';
import { join } from 'path';

// @akili-spec institutional-performance/strategy-framework B-9 follow-up 7.
// jsdom cannot measure the painted gap between the heading and the first field (KZ-017).
// Each assertion reads one rule, cut at that rule's closing brace.

const scss = readFileSync(join(__dirname, 'panel-heading.component.scss'), 'utf8');
const pillScss = readFileSync(join(__dirname, '../ods-code-pill.scss'), 'utf8');

const rule = (source: string, selector: string): string => {
  const start = source.indexOf(selector);
  return source.slice(start, source.indexOf('}', start) + 1);
};

describe('PanelHeadingComponent styles', () => {
  it('keeps 24px under the title and 8px between the eyebrow and the title', () => {
    const host = rule(scss, ':host {');
    const heading = rule(scss, '.panel-heading {');

    expect(host).toContain('margin-bottom: 24px');
    expect(host).not.toContain('.panel-heading');
    expect(heading).toContain('gap: 8px');
    expect(heading).not.toContain('.panel-heading__eyebrow');
  });

  it('paints the code pill with the grey-200 token', () => {
    const pill = rule(pillScss, '@mixin ods-code-pill {');

    expect(pill).toContain('background: var(--ac-grey-200)');
    expect(pill).not.toContain('grey-100');
    expect(pill.endsWith('}')).toBe(true);
  });
});
