import { TestBed } from '@angular/core/testing';
import { FormatDatePipe } from './format-date.pipe';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { signal } from '@angular/core';

describe('FormatDatePipe', () => {
  let pipe: FormatDatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatDatePipe, { provide: DateFormatConfigService, useValue: { config: signal(null) } }]
    });
    pipe = TestBed.inject(FormatDatePipe);
  });

  it('should return formatted string for valid UTC date string', () => {
    const result = pipe.transform('2026-02-26T21:43:03.683Z');
    expect(result).toContain(' at ');
    expect(result).not.toBe('');
  });

  it('should return formatted string for valid Date', () => {
    const result = pipe.transform(new Date('2026-02-26T21:43:03.683Z'));
    expect(result).not.toBe('');
  });

  it('should return empty string when value is null (cover line 10 ?? branch)', () => {
    const result = pipe.transform(null);
    expect(result).toBe('');
  });

  it('should return empty string when value is undefined', () => {
    const result = pipe.transform(undefined);
    expect(result).toBe('');
  });

  it('should return empty string when value is invalid date string', () => {
    const result = pipe.transform('not-a-date');
    expect(result).toBe('');
  });
});
