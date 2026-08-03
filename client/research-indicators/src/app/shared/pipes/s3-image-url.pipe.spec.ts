import { S3ImageUrlPipe } from './s3-image-url.pipe';

// Mock environment used inside the pipe (must match the relative import in the pipe)
jest.mock('../../../environments/environment', () => ({
  environment: {
    s3Folder: 'https://cdn.example.com/public-dev/'
  }
}));

describe('S3ImageUrlPipe', () => {
  let pipe: S3ImageUrlPipe;

  beforeEach(() => {
    pipe = new S3ImageUrlPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should prefix without altering when path has no leading slash', () => {
    const result = pipe.transform('images/logo.png');
    expect(result).toBe('https://cdn.example.com/public-dev/images/logo.png');
  });

  it('should remove leading slash and prefix correctly', () => {
    const result = pipe.transform('/images/logo.png');
    expect(result).toBe('https://cdn.example.com/public-dev/images/logo.png');
  });

  it('should handle empty string input', () => {
    expect(pipe.transform('')).toBe('');
  });
});


