import { TestBed } from '@angular/core/testing';
import { ControlListCacheService } from './control-list-cache.service';

describe('ControlListCacheService', () => {
  let service: ControlListCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ControlListCacheService]
    });
    service = TestBed.inject(ControlListCacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('set', () => {
    it('should store data with string key', () => {
      const testData = { id: 1, name: 'test' };
      service.set('test-key', testData);
      expect(service.get('test-key')).toEqual(testData);
    });

    it('should overwrite existing data with same key', () => {
      const initialData = { id: 1, name: 'initial' };
      const updatedData = { id: 2, name: 'updated' };

      service.set('test-key', initialData);
      service.set('test-key', updatedData);

      expect(service.get('test-key')).toEqual(updatedData);
    });

    it('should store different data types', () => {
      const stringData = 'test string';
      const numberData = 123;
      const arrayData = [1, 2, 3];
      const objectData = { key: 'value' };
      const nullData = null;
      const undefinedData = undefined;

      service.set('string', stringData);
      service.set('number', numberData);
      service.set('array', arrayData);
      service.set('object', objectData);
      service.set('null', nullData);
      service.set('undefined', undefinedData);

      expect(service.get('string')).toBe(stringData);
      expect(service.get('number')).toBe(numberData);
      expect(service.get('array')).toEqual(arrayData);
      expect(service.get('object')).toEqual(objectData);
      expect(service.get('null')).toBeNull();
      expect(service.get('undefined')).toBeNull();
    });
  });

  describe('get', () => {
    it('should return stored data', () => {
      const testData = { id: 1, name: 'test' };
      service.set('test-key', testData);
      expect(service.get('test-key')).toEqual(testData);
    });

    it('should return null for non-existent key', () => {
      expect(service.get('non-existent')).toBeNull();
    });

    it('should return null for empty string key', () => {
      expect(service.get('')).toBeNull();
    });

    it('should return null for undefined key', () => {
      expect(service.get(undefined as any)).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return empty Map when cache is empty', () => {
      const result = service.getAll();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return Map with all stored data', () => {
      const data1 = { id: 1, name: 'test1' };
      const data2 = { id: 2, name: 'test2' };

      service.set('key1', data1);
      service.set('key2', data2);

      const result = service.getAll();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual(data1);
      expect(result.get('key2')).toEqual(data2);
    });

    it('should return the same Map instance', () => {
      const result1 = service.getAll();
      const result2 = service.getAll();
      expect(result1).toBe(result2);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      service.set('test-key', 'test-data');
      expect(service.has('test-key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(service.has('non-existent')).toBe(false);
    });

    it('should return false for empty string key', () => {
      expect(service.has('')).toBe(false);
    });

    it('should return false for undefined key', () => {
      expect(service.has(undefined as any)).toBe(false);
    });

    it('should return false after data is overwritten with null', () => {
      service.set('test-key', 'test-data');
      service.set('test-key', null);
      expect(service.has('test-key')).toBe(true); // Map.has() returns true even for null values
    });
  });

  describe('clear', () => {
    it('should remove all data from cache', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');

      expect(service.getAll().size).toBe(2);

      service.clear();

      expect(service.getAll().size).toBe(0);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
    });

    it('should work on empty cache', () => {
      expect(service.getAll().size).toBe(0);
      service.clear();
      expect(service.getAll().size).toBe(0);
    });

    it('should allow setting new data after clear', () => {
      service.set('key1', 'data1');
      service.clear();
      service.set('key2', 'data2');

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBe('data2');
    });
  });

  describe('integration tests', () => {
    it('should handle multiple operations in sequence', () => {
      // Set multiple items
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      // Verify all are stored
      expect(service.has('key1')).toBe(true);
      expect(service.has('key2')).toBe(true);
      expect(service.has('key3')).toBe(true);
      expect(service.get('key1')).toBe('value1');
      expect(service.get('key2')).toBe('value2');
      expect(service.get('key3')).toBe('value3');

      // Update one item
      service.set('key2', 'updated-value2');
      expect(service.get('key2')).toBe('updated-value2');

      // Clear and verify
      service.clear();
      expect(service.getAll().size).toBe(0);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toBeNull();
    });

    it('should handle complex objects and arrays', () => {
      const complexObject = {
        id: 1,
        name: 'test',
        items: [1, 2, 3],
        metadata: {
          created: new Date(),
          tags: ['tag1', 'tag2']
        }
      };

      service.set('complex', complexObject);
      const retrieved = service.get('complex');

      expect(retrieved).toEqual(complexObject);
      expect(retrieved.items).toEqual([1, 2, 3]);
      expect(retrieved.metadata.tags).toEqual(['tag1', 'tag2']);
    });
  });
});
