import { QueryParseBool } from './query-parse-boolean.pipe';

describe('QueryParseBool', () => {
  const pipe = new QueryParseBool();

  it('should be true only for string true', () => {
    expect(pipe.transform('true')).toBe(true);
    expect(pipe.transform('TRUE')).toBe(true);
    expect(pipe.transform('false')).toBe(false);
  });

  it('should be false for non-string', () => {
    expect(pipe.transform(1)).toBe(false);
  });
});
