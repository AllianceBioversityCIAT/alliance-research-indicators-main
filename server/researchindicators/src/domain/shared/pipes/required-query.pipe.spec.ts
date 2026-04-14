import { BadRequestException } from '@nestjs/common';
import { RequiredQueryPipe } from './required-query.pipe';

describe('RequiredQueryPipe', () => {
  it('should pass through non-empty value', () => {
    const pipe = new RequiredQueryPipe('q');
    expect(pipe.transform('ok')).toBe('ok');
  });

  it('should throw when missing or blank', () => {
    const pipe = new RequiredQueryPipe('q');
    expect(() => pipe.transform(undefined as any)).toThrow(BadRequestException);
    expect(() => pipe.transform(null as any)).toThrow(BadRequestException);
    expect(() => pipe.transform('  ')).toThrow(BadRequestException);
  });
});
