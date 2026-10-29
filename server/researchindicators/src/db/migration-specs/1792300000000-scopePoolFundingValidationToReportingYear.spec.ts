import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentReportingYearSql } from '../../domain/shared/utils/reporting-year.resolver';

const normalise = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('1792300000000 scopePoolFundingValidationToReportingYear', () => {
  const source = readFileSync(
    join(
      __dirname,
      '../migrations/1792300000000-scopePoolFundingValidationToReportingYear.ts',
    ),
    'utf8',
  );

  it('embeds currentReportingYearSql, whitespace-normalised (RB-9)', () => {
    expect(normalise(source)).toContain(normalise(currentReportingYearSql));
  });
});
