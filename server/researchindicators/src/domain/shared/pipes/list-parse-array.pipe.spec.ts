import { ListParseToArrayPipe } from './list-parse-array.pipe';

describe('ListParseToArrayPipe', () => {
  const pipe = new ListParseToArrayPipe();

  it('should split comma string and sanitize', () => {
    expect(pipe.transform(' a, b ')).toEqual(['a', 'b']);
  });

  it('should trim array elements', () => {
    expect(pipe.transform([' x ', 'y'])).toEqual(['x', 'y']);
  });
});
