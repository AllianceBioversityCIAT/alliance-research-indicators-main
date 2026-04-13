import { UpdateQueryBuilder } from 'typeorm';
import {
  updateQueryBuilderWhere,
  formatArrayToQuery,
  formatString,
  notOption,
} from './queries.util';

describe('queries.util', () => {
  describe('notOption', () => {
    it('should return empty when not negated', () => {
      expect(notOption(false, true)).toBe('');
    });

    it('should return NOT for array negation', () => {
      expect(notOption(true, true)).toBe('NOT');
    });

    it('should return ! for scalar negation', () => {
      expect(notOption(true, false)).toBe('!');
    });
  });

  describe('formatArrayToQuery', () => {
    it('should quote and join', () => {
      expect(formatArrayToQuery([1, 'a'])).toBe(`'1','a'`);
    });
  });

  describe('formatString', () => {
    it('should escape single quotes', () => {
      expect(formatString("O'Brien")).toBe(`'O''Brien'`);
    });
  });

  describe('updateQueryBuilderWhere', () => {
    it('should add scalar and array where clauses', () => {
      const andWhere = jest.fn().mockReturnThis();
      const qb = { andWhere } as unknown as UpdateQueryBuilder<any>;

      updateQueryBuilderWhere(qb, {
        status: { value: 1, not: false },
        ids: { value: [2, 3], not: true },
      } as any);

      expect(andWhere).toHaveBeenCalled();
      expect(andWhere.mock.calls.length).toBe(2);
    });
  });
});
