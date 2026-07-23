import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { UtilsService } from './utils.service';

describe('UtilsService', () => {
  let service: UtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setNestedPropertyWithReduceSignal', () => {
    it('should set a nested property (depth 2) in a signal', () => {
      const s: WritableSignal<any> = signal({ a: { b: 1 } });
      service.setNestedPropertyWithReduceSignal(s, 'a.b', 42);
      expect(s().a.b).toBe(42);
    });
    it('should set a top-level property in a signal', () => {
      const s: WritableSignal<any> = signal({ x: 1 });
      service.setNestedPropertyWithReduceSignal(s, 'x', 99);
      expect(s().x).toBe(99);
    });
    it('should create nested objects if missing', () => {
      const s: WritableSignal<any> = signal({});
      service.setNestedPropertyWithReduceSignal(s, 'foo.bar', 'baz');
      expect(s().foo.bar).toBe('baz');
    });
  });

  describe('setNestedPropertyWithReduce', () => {
    it('should set a nested property (depth 2) in an object', () => {
      const obj: any = { a: { b: 1 } };
      service.setNestedPropertyWithReduce(obj, 'a.b', 42);
      expect(obj.a.b).toBe(42);
    });
    it('should set a top-level property in an object', () => {
      const obj: any = { x: 1 };
      service.setNestedPropertyWithReduce(obj, 'x', 99);
      expect(obj.x).toBe(99);
    });
    it('should create nested objects if missing', () => {
      const obj: any = {};
      service.setNestedPropertyWithReduce(obj, 'foo.bar', 'baz');
      expect(obj.foo.bar).toBe('baz');
    });
  });

  describe('getNestedProperty', () => {
    it('should get a nested property (depth 2)', () => {
      const obj = { a: { b: 123 } };
      expect(service.getNestedProperty(obj, 'a.b')).toBe(123);
    });
    it('should get a top-level property', () => {
      const obj = { x: 456 };
      expect(service.getNestedProperty(obj, 'x')).toBe(456);
    });
    it('should return undefined for missing property', () => {
      const obj = { a: {} };
      expect(service.getNestedProperty(obj, 'a.b')).toBeUndefined();
    });
  });

  describe('getNestedPropertySignal', () => {
    it('should get a nested property (depth 2) from a signal', () => {
      const s: WritableSignal<any> = signal({ a: { b: 321 } });
      expect(service.getNestedPropertySignal(s, 'a.b')).toBe(321);
    });
    it('should get a top-level property from a signal', () => {
      const s: WritableSignal<any> = signal({ x: 654 });
      expect(service.getNestedPropertySignal(s, 'x')).toBe(654);
    });
    it('should return undefined for missing property in signal', () => {
      const s: WritableSignal<any> = signal({ a: {} });
      expect(service.getNestedPropertySignal(s, 'a.b')).toBeUndefined();
    });
  });
});
