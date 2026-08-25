import * as fs from 'fs';
import * as path from 'path';
import { CHART_EXPLAINERS, ChartExplainerKey } from './chart-explainers.constants';
import { ChartExplainer } from '../interfaces/chart-explainer.interface';

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

/**
 * R-CXP-005 plain-language copy standard lint (T-03). Verbatim term lists per AC.2/details —
 * do NOT shorten them (root CLAUDE.md "Evidence disqualifiers": a green lint with a shortened
 * jargon list is not evidence).
 */
const JARGON_TERMS = ['bipartite', 'treemap', 'funnel', 'heatmap'];
const ACRONYMS = ['IRL', 'SP', 'AOW', 'HLO', 'OICR'];
const MAX_SENTENCE_CHARS = 220;
const MAX_ENTRY_SENTENCES = 3; // what + howToRead + source combined, per entry (R-CXP-005 AC.2)
const REQUIRED_FIELDS = ['title', 'what', 'howToRead', 'source', 'derivedFrom'] as const;
const PROSE_FIELDS = ['what', 'howToRead', 'source', 'emptyHint'] as const;

const ENTRIES = Object.entries(CHART_EXPLAINERS) as [ChartExplainerKey, ChartExplainer][];

/** Splits on sentence-terminal punctuation followed by whitespace. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * A listed term is "glossed" when its own sentence also carries a parenthetical or an em-dash
 * aside (R-CXP-005 AC.2: "an accompanying parenthetical or '—' gloss in the same sentence").
 * `caseSensitive=false` is used for jargon (may appear capitalized at a sentence start);
 * acronyms stay case-sensitive since a lowercase match is not the acronym.
 */
function findUnglossedTerms(text: string, terms: string[], caseSensitive: boolean): string[] {
  const hits: string[] = [];
  for (const sentence of splitSentences(text)) {
    const hasGloss = sentence.includes('(') || sentence.includes('—');
    for (const term of terms) {
      const re = new RegExp(`\\b${term}\\b`, caseSensitive ? '' : 'i');
      if (re.test(sentence) && !hasGloss) {
        hits.push(`"${term}" in "${sentence}"`);
      }
    }
  }
  return hits;
}

describe('CHART_EXPLAINERS plain-language copy standard (R-CXP-005 AC.1 starting gate + AC.2, T-03)', () => {
  it('no field contains a TODO placeholder — starting red for this task is T-02s placeholder registry', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      const fields: (keyof ChartExplainer)[] = ['title', 'what', 'howToRead', 'source', 'derivedFrom', 'emptyHint'];
      for (const field of fields) {
        const value = entry[field];
        if (typeof value === 'string' && value.includes('TODO:')) {
          violations.push(`${key}.${field}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('every required field (title, what, howToRead, source, derivedFrom) is non-empty', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      for (const field of REQUIRED_FIELDS) {
        const value = entry[field];
        if (!value || value.trim().length === 0) {
          violations.push(`${key}.${field}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('what + howToRead + source combined is at most 3 sentences per entry (R-CXP-005 AC.2)', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      const combined = `${entry.what} ${entry.howToRead} ${entry.source}`;
      const count = splitSentences(combined).length;
      if (count > MAX_ENTRY_SENTENCES) {
        violations.push(`${key}: ${count} sentences`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no single sentence in any prose field exceeds 220 characters', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      for (const field of PROSE_FIELDS) {
        const value = entry[field];
        if (!value) continue;
        for (const sentence of splitSentences(value)) {
          if (sentence.length > MAX_SENTENCE_CHARS) {
            violations.push(`${key}.${field}: ${sentence.length} chars — "${sentence}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('listed chart jargon never appears without a parenthetical/em-dash gloss in the same sentence (verbatim term list)', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      for (const field of PROSE_FIELDS) {
        const value = entry[field];
        if (!value) continue;
        findUnglossedTerms(value, JARGON_TERMS, false).forEach(hit => violations.push(`${key}.${field}: ${hit}`));
      }
    }
    expect(violations).toEqual([]);
  });

  it('listed acronyms never appear without a gloss in the same sentence on first use (verbatim acronym list)', () => {
    const violations: string[] = [];
    for (const [key, entry] of ENTRIES) {
      for (const field of PROSE_FIELDS) {
        const value = entry[field];
        if (!value) continue;
        findUnglossedTerms(value, ACRONYMS, true).forEach(hit => violations.push(`${key}.${field}: ${hit}`));
      }
    }
    expect(violations).toEqual([]);
  });

  it('all 6 "what" fields are pairwise distinct — no shared generic copy (R-CXP-001, feeds T-02s cross-wiring discriminating power)', () => {
    const whats = ENTRIES.map(([, entry]) => entry.what);
    expect(new Set(whats).size).toBe(whats.length);
  });
});
