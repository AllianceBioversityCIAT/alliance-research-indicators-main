import { TestBed } from '@angular/core/testing';
import { WordCountService } from './word-count.service';

describe('WordCountService', () => {
  let service: WordCountService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WordCountService]
    });
    service = TestBed.inject(WordCountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 0 for null input', () => {
    expect(service.getWordCount(null)).toBe(0);
  });

  it('should return 0 for undefined input', () => {
    expect(service.getWordCount(undefined)).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(service.getWordCount('')).toBe(0);
  });

  it('should return 0 for string with only spaces', () => {
    expect(service.getWordCount('   ')).toBe(0);
  });

  it('should return 0 for string with only tabs and newlines', () => {
    expect(service.getWordCount('\t\n\r')).toBe(0);
  });

  it('should return 1 for single word', () => {
    expect(service.getWordCount('hello')).toBe(1);
  });

  it('should return 1 for single word with leading/trailing spaces', () => {
    expect(service.getWordCount('  hello  ')).toBe(1);
  });

  it('should return 2 for two words', () => {
    expect(service.getWordCount('hello world')).toBe(2);
  });

  it('should return 2 for two words with multiple spaces', () => {
    expect(service.getWordCount('hello    world')).toBe(2);
  });

  it('should return 3 for three words with mixed whitespace', () => {
    expect(service.getWordCount('hello   world   test')).toBe(3);
  });

  it('should return 5 for sentence with punctuation', () => {
    expect(service.getWordCount('Hello, world! How are you?')).toBe(5);
  });

  it('should return 1 for number input', () => {
    expect(service.getWordCount(123)).toBe(1);
  });

  it('should return 0 for zero number input', () => {
    expect(service.getWordCount(0)).toBe(0);
  });

  it('should return 1 for negative number input', () => {
    expect(service.getWordCount(-123)).toBe(1);
  });

  it('should return 1 for decimal number input', () => {
    expect(service.getWordCount(123.45)).toBe(1);
  });

  it('should handle string with only punctuation', () => {
    expect(service.getWordCount('!@#$%^&*()')).toBe(1);
  });

  it('should handle string with numbers and letters', () => {
    expect(service.getWordCount('hello123 world456')).toBe(2);
  });

  it('should handle string with special characters', () => {
    expect(service.getWordCount('hello-world test_case')).toBe(2);
  });

  it('should handle string with unicode characters', () => {
    expect(service.getWordCount('café résumé')).toBe(2);
  });

  it('should handle string with emojis', () => {
    expect(service.getWordCount('hello 😀 world 🌍')).toBe(4);
  });

  it('should handle very long string', () => {
    const longString = 'word '.repeat(1000).trim();
    expect(service.getWordCount(longString)).toBe(1000);
  });

  it('should handle string with multiple consecutive spaces', () => {
    expect(service.getWordCount('hello        world')).toBe(2);
  });

  it('should handle string with tabs and newlines', () => {
    expect(service.getWordCount('hello\tworld\ntest')).toBe(3);
  });

  it('should handle string with carriage returns', () => {
    expect(service.getWordCount('hello\rworld\r\ntest')).toBe(3);
  });

  it('should handle string with form feeds', () => {
    expect(service.getWordCount('hello\fworld')).toBe(2);
  });

  it('should handle string with vertical tabs', () => {
    expect(service.getWordCount('hello\vworld')).toBe(2);
  });

  it('should handle string with non-breaking spaces', () => {
    expect(service.getWordCount('hello\u00A0world')).toBe(2);
  });

  it('should handle string with zero-width spaces', () => {
    expect(service.getWordCount('hello\u200Bworld')).toBe(1);
  });

  it('should handle string with only non-breaking spaces', () => {
    expect(service.getWordCount('\u00A0\u00A0\u00A0')).toBe(0);
  });

  it('should handle string with mixed whitespace characters', () => {
    expect(service.getWordCount('hello \t\n\r\f\v world')).toBe(2);
  });

  it('should handle string with leading and trailing mixed whitespace', () => {
    expect(service.getWordCount('\t\n\r\f\v hello world \t\n\r\f\v')).toBe(2);
  });
});
