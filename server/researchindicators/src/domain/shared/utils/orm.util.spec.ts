import { EntityManager, Repository } from 'typeorm';
import {
  cleanNumberForDB,
  selectManager,
  transactionManager,
} from './orm.util';

class Dummy {}

describe('orm.util', () => {
  describe('selectManager', () => {
    it('should use manager repository when manager provided', () => {
      const repo = { x: 1 } as unknown as Repository<Dummy>;
      const innerRepo = jest.fn().mockReturnValue(repo);
      const manager = { getRepository: innerRepo } as unknown as EntityManager;
      const internal = {} as Repository<Dummy>;
      expect(selectManager(manager, Dummy, internal as any)).toBe(repo);
      expect(innerRepo).toHaveBeenCalledWith(Dummy);
    });

    it('should use internal when manager falsy', () => {
      const internal = { y: 2 } as unknown as Repository<Dummy>;
      expect(selectManager(null as any, Dummy, internal as any)).toBe(internal);
    });
  });

  describe('cleanNumberForDB', () => {
    it('should return number when valid', () => {
      expect(cleanNumberForDB(5)).toBe(5);
      expect(cleanNumberForDB('3')).toBe(3);
    });

    it('should return 0 for NaN or empty', () => {
      expect(cleanNumberForDB('abc')).toBe(0);
      expect(cleanNumberForDB(Number.NaN)).toBe(0);
    });
  });

  describe('transactionManager', () => {
    it('should prefer manager when not empty', () => {
      const m = {} as EntityManager;
      const ds = { id: 'ds' } as unknown as EntityManager;
      expect(transactionManager(m, ds)).toBe(m);
    });

    it('should fall back to dataSource manager', () => {
      const ds = { id: 'ds' } as unknown as EntityManager;
      expect(transactionManager(null as any, ds)).toBe(ds);
    });
  });
});
