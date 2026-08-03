import { getBrowserInfo, BrowserInfo } from './browser.util';

describe('browser.util', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  });

  describe('getBrowserInfo', () => {
    it('should detect Opera correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.254',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Opera');
      expect(result.fullVersion).toBe('77.0.4054.254');
      expect(result.majorVersion).toBe(77);
    });

    it('should detect Opera with Version in userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.254 Version/77.0.4054.254',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Opera');
      expect(result.fullVersion).toBe('77.0.4054.254');
      expect(result.majorVersion).toBe(77);
    });

    it('should detect Microsoft Edge correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Microsoft Edge');
      expect(result.fullVersion).toBe('91.0.864.59');
      expect(result.majorVersion).toBe(91);
    });

    it('should detect Internet Explorer correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko MSIE 11.0',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Microsoft Internet Explorer');
      expect(result.fullVersion).toBe('11.0');
      expect(result.majorVersion).toBe(11);
    });

    it('should detect Chrome correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('91.0.4472.124');
      expect(result.majorVersion).toBe(91);
    });

    it('should detect Safari correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Safari');
      expect(result.fullVersion).toBe('14.1.1');
      expect(result.majorVersion).toBe(14);
    });

    it('should detect Safari with Version in userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Safari');
      expect(result.fullVersion).toBe('14.1.1');
      expect(result.majorVersion).toBe(14);
    });

    it('should detect Firefox correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Firefox');
      expect(result.fullVersion).toBe('89.0');
      expect(result.majorVersion).toBe(89);
    });

    it('should detect generic browser with name/version format', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'CustomBrowser/1.2.3',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('CustomBrowser');
      expect(result.fullVersion).toBe('1.2.3');
      expect(result.majorVersion).toBe(1);
    });

    it('should handle generic browser with uppercase name (should be Unknown)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'ABCDEF/1.2.3',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('ABCDEF');
      expect(result.fullVersion).toBe('1.2.3');
      expect(result.majorVersion).toBe(1);
    });

    it('should handle version with semicolon', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124; Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('91.0.4472.124');
      expect(result.majorVersion).toBe(91);
    });

    it('should handle version with space', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('91.0.4472.124');
      expect(result.majorVersion).toBe(91);
    });

    it('should handle invalid version (NaN)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/invalid Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('Mozilla/5.0');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle completely unknown userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'UnknownBrowser',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('UnknownBrowser');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle empty userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: '',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle version with multiple spaces', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124   Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('91.0.4472.124');
      expect(result.majorVersion).toBe(91);
    });

    it('should handle version with multiple semicolons', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124;; Safari/537.36',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Chrome');
      expect(result.fullVersion).toBe('91.0.4472.124');
      expect(result.majorVersion).toBe(91);
    });

    it('should handle case where no known browser is present', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'SomeRandomString',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('SomeRandomString');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle case where name/version format is not found', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'NoSlashHere',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('NoSlashHere');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle case where name/version format is not found (no slash)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'NoSlashHere',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('NoSlashHere');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle case where name/version format is not found (condition not met)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Test Test',
        configurable: true
      });

      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('Test');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle browser with only numeric name as Unknown', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: '12345/6.7.8',
        configurable: true
      });
      const result = getBrowserInfo();
      expect(result.name).toBe('Unknown');
      expect(result.fullVersion).toBe('6.7.8');
      expect(result.majorVersion).toBe(6);
    });
  });
});
