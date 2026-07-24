import { getContractStatusClasses } from './status-classes.constants';

describe('getContractStatusClasses', () => {
  it('should return SUSPENDED styles for suspended status', () => {
    const result = getContractStatusClasses('suspended');
    expect(result).toBe('text-[#F58220] border border-[#F58220]');
  });

  it('should return SUSPENDED styles for SUSPENDED status (uppercase)', () => {
    const result = getContractStatusClasses('SUSPENDED');
    expect(result).toBe('text-[#F58220] border border-[#F58220]');
  });

  it('should return DISCONTINUED styles for discontinued status', () => {
    const result = getContractStatusClasses('discontinued');
    expect(result).toBe('text-[#777c83] border border-[#777c83]');
  });

  it('should return DISCONTINUED styles for DISCONTINUED status (uppercase)', () => {
    const result = getContractStatusClasses('DISCONTINUED');
    expect(result).toBe('text-[#777c83] border border-[#777c83]');
  });

  it('should return ONGOING styles for ongoing status', () => {
    const result = getContractStatusClasses('ongoing');
    expect(result).toBe('text-[#153C71] border border-[#7C9CB9]');
  });

  it('should return ONGOING styles for ONGOING status (uppercase)', () => {
    const result = getContractStatusClasses('ONGOING');
    expect(result).toBe('text-[#153C71] border border-[#7C9CB9]');
  });

  it('should return DEFAULT styles for unknown status', () => {
    const result = getContractStatusClasses('unknown');
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for empty string', () => {
    const result = getContractStatusClasses('');
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for null status', () => {
    const result = getContractStatusClasses(null as any);
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for undefined status', () => {
    const result = getContractStatusClasses(undefined as any);
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for mixed case status', () => {
    const result = getContractStatusClasses('OnGoInG');
    expect(result).toBe('text-[#153C71] border border-[#7C9CB9]');
  });

  it('should return DEFAULT styles for status with spaces', () => {
    const result = getContractStatusClasses(' suspended ');
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for numeric status', () => {
    const result = getContractStatusClasses('123');
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });

  it('should return DEFAULT styles for special characters', () => {
    const result = getContractStatusClasses('!@#$%');
    expect(result).toBe('text-[#235B2D] border border-[#7CB580]');
  });
});
