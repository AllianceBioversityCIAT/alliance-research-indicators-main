import { readFileSync } from 'fs';
import { join } from 'path';
import { MAPPING_STATUS_COLOR, PFM_STATE, PRMS_STATUS_COLOR } from './pfm-status-colors';

// The status palette lives in colors.scss; these tests read the real file so a token edit there
// cannot quietly make two statuses look alike.
const scss = readFileSync(join(__dirname, '../../../styles/colors.scss'), 'utf8');

/** Every value a token takes, in source order: [light, dark]. Follows one level of var() aliasing. */
function values(token: string): string[] {
  const raw = [...scss.matchAll(new RegExp(`${token}:\\s*([^;]+);`, 'g'))].map(m => m[1].trim());
  return raw.map((v, i) => {
    const alias = /^var\((--[\w-]+)\)$/.exec(v);
    if (!alias) return v.toLowerCase();
    const target = values(alias[1]);
    return target[i] ?? target[0];
  });
}
const light = (token: string) => values(token)[0];

/** STAR Approved (result_status config): never changed by the monitor, only kept apart from. */
const STAR_APPROVED = '#7cb580';
const STAR_APPROVED_BORDER = '#a8ceab';
const STAR_SUBMITTED = '#173f6f';

/** HSL hue in degrees, -1 for a grey. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return -1;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** HSL saturation, 0..1. */
function saturation(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Owner: no purple, and no bright royal blue / indigo either, which reads as purple. */
const looksPurple = (hex: string) => {
  const h = hue(hex);
  return (h >= 250 && h <= 330) || (h >= 216 && h < 250 && saturation(hex) > 0.7);
};

describe('PFM status colours (one palette, owner rules)', () => {
  // Owner: mapping Complete takes the green of done; PRMS Approved takes the STAR Approved sage.
  it('mapping Complete is the green of done, not the Ready-to-sync blue', () => {
    expect(MAPPING_STATUS_COLOR.Complete).toBe('var(--ac-status-mapping-complete)');
    expect(PFM_STATE.complete.fg).toBe('var(--ac-state-complete-fg)');
    expect(values('--ac-status-mapping-complete')).toEqual(values('--ac-state-done-fg'));
    expect(light('--ac-status-mapping-complete')).not.toBe(light('--ac-state-ready-fg'));
  });

  it('PRMS Approved is exactly the STAR Approved tag (text and outline), in both themes', () => {
    expect(values('--ac-status-prms-approved')).toEqual([STAR_APPROVED, STAR_APPROVED]);
    expect(values('--ac-status-prms-approved-border')).toEqual([STAR_APPROVED_BORDER, STAR_APPROVED_BORDER]);
    expect(PFM_STATE.approved.fill).toBe('var(--ac-state-approved-fill)');
    expect(light('--ac-pfm-seg-approved')).toBe(STAR_APPROVED);
  });

  it('No SP contribution is a blue-green (aquamarine), apart from both greens', () => {
    const noSp = light('--ac-status-mapping-no-sp');
    expect([light('--ac-status-mapping-complete'), light('--ac-status-prms-approved')]).not.toContain(noSp);
    for (const v of values('--ac-status-mapping-no-sp')) expect(hue(v)).toBeGreaterThanOrEqual(175);
    for (const v of values('--ac-status-mapping-no-sp')) expect(hue(v)).toBeLessThanOrEqual(200);
  });

  // Owner: mapping Pending, PRMS Pending Review, the Mapping pending quick view and the
  // Finish the mapping card are the same orange.
  it('every pending is the orange of Mapping pending / Finish the mapping, never the STAR Submitted navy', () => {
    expect(values('--ac-status-mapping-pending')).toEqual(values('--ac-state-progress-fg'));
    expect(values('--ac-status-prms-pending')).toEqual(values('--ac-state-progress-fg'));
    expect(values('--ac-pfm-seg-pending')).toEqual(values('--ac-state-progress-fill'));
    expect(light('--ac-status-mapping-pending')).not.toBe(STAR_SUBMITTED);
  });

  it('no state token, light or dark, is purple or a bright royal blue / indigo', () => {
    const tokens = [...new Set([...scss.matchAll(/(--ac-state-[\w-]+):/g)].map(m => m[1]))];
    expect(tokens.length).toBeGreaterThan(10);
    const offenders = tokens.flatMap(t => values(t).filter(v => /^#[0-9a-f]{6}$/.test(v) && looksPurple(v)).map(v => `${t} ${v}`));
    expect(offenders).toEqual([]);
  });

  it('Ready to sync uses the Sync activity steel blue', () => {
    expect(values('--ac-state-ready')).toEqual([light('--ac-pfm-month-5'), values('--ac-pfm-month-6')[1]]);
  });

  // Owner: the same state is the same colour in a table tag, a card, a quick-view dot and a chart.
  it('one colour per state: -fg and -fill are the same value, in both themes', () => {
    for (const st of ['todo', 'progress', 'ready', 'waiting', 'done', 'complete', 'alert', 'approved', 'out']) {
      expect({ st, fg: values(`--ac-state-${st}-fg`) }).toEqual({ st, fg: values(`--ac-state-${st}-fill`) });
    }
    // the Finish the mapping card and the Mapping pending dot read the same orange as the table tag
    expect(values('--ac-state-progress-fill')).toEqual(values('--ac-status-mapping-pending'));
  });

  it('PRMS statuses: one colour each, the same token the sidebar sync card reads', () => {
    expect(PRMS_STATUS_COLOR).toEqual({
      pending: 'var(--ac-status-prms-pending)',
      approved: 'var(--ac-status-prms-approved)',
      rejected: 'var(--ac-status-prms-rejected)'
    });
    const prms = ['pending', 'approved', 'rejected'].map(k => light(`--ac-status-prms-${k}`));
    expect(new Set(prms).size).toBe(3);
  });

  it('no status token is purple (hue 250-330) in light or dark', () => {
    for (const t of ['--ac-status-mapping-pending', '--ac-status-mapping-complete', '--ac-status-mapping-no-sp', '--ac-status-prms-pending', '--ac-status-prms-approved', '--ac-status-prms-approved-border', '--ac-status-prms-rejected']) {
      for (const v of values(t)) {
        const h = hue(v);
        expect({ token: t, value: v, purple: h >= 250 && h <= 330 }).toEqual({ token: t, value: v, purple: false });
      }
    }
  });
});
