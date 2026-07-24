import { FilterByTextWithAttrPipe } from './filter-by-text-with-attr.pipe';

describe('FilterByTextWithAttrPipe', () => {
  let pipe: FilterByTextWithAttrPipe;

  beforeEach(() => {
    pipe = new FilterByTextWithAttrPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return original list when list is null', () => {
    const result = pipe.transform(null as any, 'name', 'test');
    expect(result).toBeNull();
  });

  it('should return original list when list is undefined', () => {
    const result = pipe.transform(undefined as any, 'name', 'test');
    expect(result).toBeUndefined();
  });

  it('should return original list when attribute is null', () => {
    const list = [{ name: 'test' }];
    const result = pipe.transform(list, null as any, 'test');
    expect(result).toEqual(list);
  });

  it('should return original list when attribute is undefined', () => {
    const list = [{ name: 'test' }];
    const result = pipe.transform(list, undefined as any, 'test');
    expect(result).toEqual(list);
  });

  it('should return original list when searchText is null', () => {
    const list = [{ name: 'test' }];
    const result = pipe.transform(list, 'name', null as any);
    expect(result).toEqual(list);
  });

  it('should return original list when searchText is undefined', () => {
    const list = [{ name: 'test' }];
    const result = pipe.transform(list, 'name', undefined as any);
    expect(result).toEqual(list);
  });

  it('should return original list when searchText is empty string', () => {
    const list = [{ name: 'test' }];
    const result = pipe.transform(list, 'name', '');
    expect(result).toEqual(list);
  });

  it('should filter list by string attribute', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { name: 'Jane Smith', age: 25 },
      { name: 'Bob Johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'john');
    expect(result).toEqual([
      { name: 'John Doe', age: 30 },
      { name: 'Bob Johnson', age: 35 }
    ]);
  });

  it('should filter list by number attribute', () => {
    const list = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 }
    ];
    const result = pipe.transform(list, 'age', '3');
    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Bob', age: 35 }
    ]);
  });

  it('should filter case-insensitive', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { name: 'JANE SMITH', age: 25 },
      { name: 'bob johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'JANE');
    expect(result).toEqual([{ name: 'JANE SMITH', age: 25 }]);
  });

  it('should handle attribute with null value', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { name: null, age: 25 },
      { name: 'Bob Johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'john');
    expect(result).toEqual([
      { name: 'John Doe', age: 30 },
      { name: 'Bob Johnson', age: 35 }
    ]);
  });

  it('should handle attribute with undefined value', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { name: undefined, age: 25 },
      { name: 'Bob Johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'john');
    expect(result).toEqual([
      { name: 'John Doe', age: 30 },
      { name: 'Bob Johnson', age: 35 }
    ]);
  });

  it('should handle attribute with number value', () => {
    const list = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: null },
      { name: 'Bob', age: 35 }
    ];
    const result = pipe.transform(list, 'age', '3');
    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Bob', age: 35 }
    ]);
  });

  it('should handle attribute with boolean value', () => {
    const list = [
      { name: 'John', active: true },
      { name: 'Jane', active: false },
      { name: 'Bob', active: true }
    ];
    const result = pipe.transform(list, 'active', 'true');
    expect(result).toEqual([
      { name: 'John', active: true },
      { name: 'Bob', active: true }
    ]);
  });

  it('should handle attribute with object value', () => {
    const list = [
      { name: 'John', data: { type: 'user' } },
      { name: 'Jane', data: { type: 'admin' } },
      { name: 'Bob', data: { type: 'user' } }
    ];
    const result = pipe.transform(list, 'data', 'object');
    expect(result).toEqual([
      { name: 'John', data: { type: 'user' } },
      { name: 'Jane', data: { type: 'admin' } },
      { name: 'Bob', data: { type: 'user' } }
    ]);
  });

  it('should return empty array when no matches found', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { name: 'Jane Smith', age: 25 },
      { name: 'Bob Johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'xyz');
    expect(result).toEqual([]);
  });

  it('should handle empty list', () => {
    const list: any[] = [];
    const result = pipe.transform(list, 'name', 'test');
    expect(result).toEqual([]);
  });

  it('should handle list with missing attribute', () => {
    const list = [
      { name: 'John Doe', age: 30 },
      { age: 25 }, // missing name
      { name: 'Bob Johnson', age: 35 }
    ];
    const result = pipe.transform(list, 'name', 'john');
    expect(result).toEqual([
      { name: 'John Doe', age: 30 },
      { name: 'Bob Johnson', age: 35 }
    ]);
  });
});
