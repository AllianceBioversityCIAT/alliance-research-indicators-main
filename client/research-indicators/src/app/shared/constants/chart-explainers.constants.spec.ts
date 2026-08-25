import * as fs from 'fs';
import * as path from 'path';
import { CHART_EXPLAINERS } from './chart-explainers.constants';

/**
 * D-CXP-8/D-CXP-10: this test scans TEMPLATE SOURCE, not rendered DOM — the template is the
 * ground truth for which Act keys are wired. This is a per-section registry (6 keys), so —
 * unlike the superseded per-chart design — every key is a fixed literal: no `EXPECTED_DYNAMIC_KEYS`
 * escape hatch is needed, and `project-dashboard.component.html` is the ONLY template scanned
 * (it is the only template that renders `<app-chart-explainer>` in this spec).
 */
const PROJECT_DASHBOARD_TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html'
);

function scanTemplateKeys(): Set<string> {
  const source = fs.readFileSync(PROJECT_DASHBOARD_TEMPLATE_PATH, 'utf8');
  const keys = new Set<string>();

  for (const match of source.matchAll(/<app-chart-explainer\b[^>]*\bkey="([a-z0-9-]+)"/g)) {
    keys.add(match[1]);
  }

  return keys;
}

describe('CHART_EXPLAINERS completeness (R-CXP-004 AC.1-3, D-CXP-10 — single-template scan)', () => {
  it('every key used in project-dashboard.component.html exists in the registry — no missing entry', () => {
    const templateKeys = scanTemplateKeys();
    const registryKeys = new Set(Object.keys(CHART_EXPLAINERS));

    const missingFromRegistry = [...templateKeys].filter(key => !registryKeys.has(key));
    expect(missingFromRegistry).toEqual([]);
  });

  it('every registry key is used at least once in the template — no dead entry', () => {
    const templateKeys = scanTemplateKeys();
    const registryKeys = Object.keys(CHART_EXPLAINERS);

    const deadKeys = registryKeys.filter(key => !templateKeys.has(key));
    expect(deadKeys).toEqual([]);
  });

  it('has exactly 6 keys, one per Act section (design.md §5.3)', () => {
    expect(Object.keys(CHART_EXPLAINERS).length).toBe(6);
  });

  it('all 6 Act keys are present (distinct-keys assertion)', () => {
    expect(Object.keys(CHART_EXPLAINERS)).toEqual(
      expect.arrayContaining(['act-1-identity', 'act-2-production', 'act-3-reach', 'act-4-direction', 'act-5-quality', 'act-6-depth'])
    );
  });
});
