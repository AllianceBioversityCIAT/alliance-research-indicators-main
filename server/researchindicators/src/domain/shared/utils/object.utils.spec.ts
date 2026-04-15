import {
  cleanObject,
  parseBoolean,
  validObject,
  validObjectAnyOf,
  isEmpty,
  setDefaultValueInObject,
  setNull,
  defaultValue,
  cleanText,
  cleanName,
} from './object.utils';

describe('object.utils', () => {
  describe('cleanObject', () => {
    it('should drop null, empty string and NaN numbers', () => {
      expect(
        cleanObject({
          a: 1,
          b: null,
          c: '',
          d: NaN,
          e: 'x',
        } as any),
      ).toEqual({ a: 1, e: 'x' });
    });
  });

  describe('parseBoolean', () => {
    it('should map string true to boolean', () => {
      const out = parseBoolean({ a: 'true', b: 'false' } as any);
      expect(out).toEqual({ a: true, b: false });
    });
  });

  describe('validObject', () => {
    it('should be valid when all keys present', () => {
      expect(validObject({ a: 1, b: 'x' } as any, ['a', 'b'] as any)).toEqual({
        isValid: true,
        invalidFields: [],
      });
    });

    it('should list invalid when keys missing', () => {
      const r = validObject({ a: 1 } as any, ['a', 'b'] as any);
      expect(r.isValid).toBe(false);
      expect(r.invalidFields).toContain('b');
    });
  });

  describe('validObjectAnyOf', () => {
    it('should be invalid when valid keys list empty', () => {
      expect(validObjectAnyOf({ a: 1 } as any, [] as any)).toEqual({
        isValid: false,
        invalidFields: [],
      });
    });

    it('should be valid when any key present', () => {
      expect(
        validObjectAnyOf({ a: '', b: 'ok' } as any, ['a', 'b'] as any),
      ).toEqual({ isValid: true, invalidFields: [] });
    });

    it('should be invalid when no key present', () => {
      const r = validObjectAnyOf({} as any, ['a', 'b'] as any);
      expect(r.isValid).toBe(false);
      expect(r.invalidFields).toEqual(['a', 'b']);
    });
  });

  describe('isEmpty', () => {
    it('should detect null, undefined, empty string, NaN, empty array', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty(Number.NaN)).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty([1])).toBe(false);
    });
  });

  describe('setDefaultValueInObject', () => {
    it('should return empty object when input not object', () => {
      expect(setDefaultValueInObject(null as any, ['a'])).toEqual({});
      expect(setDefaultValueInObject(undefined as any, ['a'])).toEqual({});
    });

    it('should set default values on keys', () => {
      const obj: any = { x: 1 };
      const out = setDefaultValueInObject(obj, ['a', 'b'], 0);
      expect(out).toMatchObject({ x: 1, a: 0, b: 0 });
    });
  });

  describe('setNull', () => {
    it('should return null for empty', () => {
      expect(setNull('')).toBeNull();
    });

    it('should return value when not empty', () => {
      expect(setNull('a')).toBe('a');
    });
  });

  describe('defaultValue', () => {
    it('should return data or default by condition', () => {
      expect(defaultValue('x', true)).toBe('x');
      expect(defaultValue('x', false, 'y')).toBe('y');
    });
  });

  describe('cleanText', () => {
    it('should lowercase and trim', () => {
      expect(cleanText('  AbC  ')).toBe('abc');
    });
  });

  describe('cleanName', () => {
    it('should title-case each word', () => {
      expect(cleanName('john DOE')).toBe('John Doe');
    });
  });
});
