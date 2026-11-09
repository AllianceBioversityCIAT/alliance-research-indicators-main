import { ExcludeYearsPipe } from './exclude-years.pipe';
import { GetYear } from '@shared/interfaces/get-year.interface';

describe('ExcludeYearsPipe', () => {
  const pipe = new ExcludeYearsPipe();
  const years = (list: number[]) => list.map(report_year => ({ report_year, has_reported: 0 }) as GetYear);

  it('removes the excluded years (p1)', () => {
    const result = pipe.transform(years([2028, 2027, 2026, 2025]), [2026]);
    expect(result?.map(y => y.report_year)).toEqual([2028, 2027, 2025]);
  });

  it('returns the same reference when the exclusion is undefined or empty (p2)', () => {
    const list = years([2028, 2026]);
    expect(pipe.transform(list, undefined)).toBe(list);
    expect(pipe.transform(list, [])).toBe(list);
  });

  it('does not throw on an undefined list (p3)', () => {
    expect(pipe.transform(undefined, [2026])).toBeUndefined();
    expect(pipe.transform(undefined)).toBeUndefined();
  });
});
