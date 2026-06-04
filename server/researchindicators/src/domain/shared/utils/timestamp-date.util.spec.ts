import { BadRequestException } from '@nestjs/common';
import { parseCapacitySharingTimestamp } from './timestamp-date.util';

describe('parseCapacitySharingTimestamp', () => {
  it('should return undefined when value is undefined', () => {
    expect(
      parseCapacitySharingTimestamp(undefined, 'start_date'),
    ).toBeUndefined();
  });

  it('should return null when value is null', () => {
    expect(parseCapacitySharingTimestamp(null, 'start_date')).toBeNull();
  });

  it('should return null when string is empty or whitespace', () => {
    expect(parseCapacitySharingTimestamp('', 'start_date')).toBeNull();
    expect(parseCapacitySharingTimestamp('   ', 'start_date')).toBeNull();
  });

  it('should accept a valid Date instance', () => {
    const input = new Date('2025-06-06T12:51:43.861Z');
    const parsed = parseCapacitySharingTimestamp(input, 'start_date');
    expect(parsed).toBe(input);
  });

  it('should throw when Date instance is invalid', () => {
    expect(() =>
      parseCapacitySharingTimestamp(new Date(Number.NaN), 'start_date'),
    ).toThrow(BadRequestException);
  });

  it('should parse a valid numeric timestamp', () => {
    const millis = Date.parse('2025-06-06T12:51:43.861Z');
    const parsed = parseCapacitySharingTimestamp(millis, 'start_date');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe('2025-06-06T12:51:43.861Z');
  });

  it('should throw when numeric timestamp is invalid', () => {
    expect(() =>
      parseCapacitySharingTimestamp(Number.NaN, 'start_date'),
    ).toThrow(BadRequestException);
  });

  it('should throw for unsupported value types', () => {
    expect(() => parseCapacitySharingTimestamp(true, 'start_date')).toThrow(
      BadRequestException,
    );
  });

  it('should parse ISO string with Z', () => {
    const parsed = parseCapacitySharingTimestamp(
      '2025-06-06T12:51:43.861Z',
      'start_date',
    );
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe('2025-06-06T12:51:43.861Z');
  });

  it('should parse mysql-like timestamp string', () => {
    const parsed = parseCapacitySharingTimestamp(
      '2025-06-06 12:51:43.861760',
      'end_date',
    );
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe('2025-06-06T12:51:43.861Z');
  });

  it('should parse date-only string as midnight UTC', () => {
    const parsed = parseCapacitySharingTimestamp('2025-06-06', 'start_date');
    expect(parsed?.toISOString()).toBe('2025-06-06T00:00:00.000Z');
  });

  it('should throw for invalid format', () => {
    expect(() =>
      parseCapacitySharingTimestamp('Sun Oct 31 2021', 'start_date'),
    ).toThrow(BadRequestException);
  });

  it('should throw when string contains T but does not match ISO pattern', () => {
    expect(() =>
      parseCapacitySharingTimestamp(
        'esto es una fecha agrego una T para que pase',
        'start_date',
      ),
    ).toThrow(BadRequestException);
  });

  it('should throw for Invalid Date string', () => {
    expect(() =>
      parseCapacitySharingTimestamp('Invalid Date', 'start_date'),
    ).toThrow(BadRequestException);
  });
});
