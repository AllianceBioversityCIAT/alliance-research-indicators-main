import { QueryRunner } from 'typeorm';
import { CreateReportInnovationDevView1791700000000 } from '../migrations/1791700000000-CreateReportInnovationDevView';

/**
 * SQL-text spec for docs/specs/innovation-dev/excel-export T-01.
 *
 * A fake QueryRunner records the SQL passed to query(). It does not execute
 * it, so a green run is not evidence that any cell value is right (KZ-001).
 * Cell values belong to
 * test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts.
 *
 * What this spec cannot reach (KZ-017): whether MySQL accepts the statement,
 * whether a lateral returns one row, whether a catalog name renders
 * Unknown (id n), and whether VIEW_DEFINITION still contains the words
 * order by from a GROUP_CONCAT sort.
 */

const NAMED_PLACEHOLDER = /(?:\?)|(?::(\d+|[a-zA-Z][a-zA-Z0-9_]*))/g;

const COLUMN_ALIASES = [
  'innovation_dev_short_title',
  'innovation_dev_nature',
  'innovation_dev_type',
  'innovation_dev_is_new_variety',
  'innovation_dev_varieties_count',
  'innovation_dev_readiness_level',
  'innovation_dev_readiness_explanation',
  'innovation_dev_anticipated_users',
  'innovation_dev_no_sex_age_disaggregation',
  'innovation_dev_actors',
  'innovation_dev_organizations',
  'innovation_dev_beneficiaries',
  'innovation_dev_expected_outcome',
  'innovation_dev_knowledge_sharing',
  'innovation_dev_dissemination',
  'innovation_dev_tool_useful_context',
  'innovation_dev_results_achieved_expected',
  'innovation_dev_tool_functions',
  'innovation_dev_used_beyond_context',
  'innovation_dev_adoption_context',
  'innovation_dev_linked_tools',
  'innovation_dev_other_tools',
  'innovation_dev_other_tools_integration',
  'innovation_dev_cheaper',
  'innovation_dev_simpler',
  'innovation_dev_performs_better',
  'innovation_dev_desirable',
  'innovation_dev_commercial_viability',
  'innovation_dev_enabling_environment',
  'innovation_dev_evidence_of_uptake',
  'innovation_dev_expansion_potential',
  'innovation_dev_expansion_details',
];

function createRecordingQueryRunner(): {
  runner: QueryRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

function maskQuotedStrings(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const chr = sql[i];
    if (chr === "'" || chr === '"') {
      const quote = chr;
      out += ' ';
      i += 1;
      while (i < sql.length) {
        if (sql[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            out += '  ';
            i += 2;
            continue;
          }
          out += ' ';
          i += 1;
          break;
        }
        out += ' ';
        i += 1;
      }
      continue;
    }
    out += chr;
    i += 1;
  }
  return out;
}

interface LateralBlock {
  start: number;
  end: number;
  body: string;
}

function findLaterals(sql: string): LateralBlock[] {
  const marker = /left\s+join\s+lateral\b/gi;
  const blocks: LateralBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = marker.exec(sql)) !== null) {
    const open = sql.indexOf('(', match.index + match[0].length);
    if (open < 0) {
      throw new Error('LEFT JOIN LATERAL without an opening parenthesis');
    }
    let depth = 0;
    let i = open;
    for (; i < sql.length; i += 1) {
      const ch = sql[i];
      if (ch === "'" || ch === '"') {
        const quote = ch;
        i += 1;
        while (i < sql.length) {
          if (sql[i] === '\\') {
            i += 2;
            continue;
          }
          if (sql[i] === quote) {
            if (sql[i + 1] === quote) {
              i += 2;
              continue;
            }
            break;
          }
          i += 1;
        }
        continue;
      }
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
    }
    const tail = sql
      .slice(i)
      .match(/^\s*(?:AS\s+)?[A-Za-z_][A-Za-z0-9_]*\s+ON\s+TRUE/i);
    if (!tail) {
      throw new Error(
        `LEFT JOIN LATERAL is missing alias ON TRUE near ${JSON.stringify(sql.slice(i, i + 40))}`,
      );
    }
    blocks.push({
      start: match.index,
      end: i + tail[0].length,
      body: sql.slice(open + 1, i - 1),
    });
    marker.lastIndex = i + tail[0].length;
  }
  return blocks;
}

function stripLaterals(sql: string): string {
  const blocks = findLaterals(sql);
  let out = '';
  let cursor = 0;
  for (const block of blocks) {
    out += sql.slice(cursor, block.start);
    cursor = block.end;
  }
  out += sql.slice(cursor);
  return out;
}

describe('CreateReportInnovationDevView1791700000000', () => {
  let upSql = '';
  let downCalls: string[] = [];

  beforeAll(async () => {
    const migration = new CreateReportInnovationDevView1791700000000();
    const up = createRecordingQueryRunner();
    await migration.up(up.runner);
    upSql = up.calls.join('\n');
    const down = createRecordingQueryRunner();
    await migration.down(down.runner);
    downCalls = down.calls;
  });

  it('(a) has no ? and no :word outside quoted strings', () => {
    const masked = maskQuotedStrings(upSql);
    NAMED_PLACEHOLDER.lastIndex = 0;
    expect(masked.match(NAMED_PLACEHOLDER)).toBeNull();
  });

  it('(b) top-level SELECT has no GROUP BY, DISTINCT, HAVING, ORDER BY, LIMIT or UNION', () => {
    const stripped = stripLaterals(upSql);
    expect(stripped).not.toMatch(
      /\b(?:GROUP\s+BY|DISTINCT|HAVING|ORDER\s+BY|LIMIT|UNION)\b/i,
    );
  });

  it('(c) SQL contains no _validation( call', () => {
    expect(upSql).not.toContain('_validation(');
    expect(downCalls.join('\n')).not.toContain('_validation(');
  });

  it('(d) has exactly 4 LEFT JOIN LATERAL blocks, each containing root.indicator_id = 2', () => {
    const blocks = findLaterals(upSql);
    expect(blocks).toHaveLength(4);
    const missing = blocks
      .map((block, index) =>
        block.body.includes('root.indicator_id = 2') ? null : index,
      )
      .filter((index) => index !== null);
    expect(missing).toEqual([]);
  });

  it('(e) exposes the 32 innovation_dev_ column aliases, each once, plus result_id', () => {
    expect(COLUMN_ALIASES).toHaveLength(32);
    for (const alias of COLUMN_ALIASES) {
      expect(alias.startsWith('innovation_dev_')).toBe(true);
      const hits = upSql.match(new RegExp(`\\bas\\s+${alias}\\b`, 'gi'));
      expect(hits).toHaveLength(1);
    }
    expect(upSql.match(/\bas\s+result_id\b/gi)).toHaveLength(1);
  });

  it('(f) down() is exactly the drop', () => {
    expect(downCalls).toEqual(['DROP VIEW IF EXISTS report_innovation_dev']);
  });
});
