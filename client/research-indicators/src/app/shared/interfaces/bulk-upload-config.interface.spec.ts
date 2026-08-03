import { ConfigurationByKeyResponse } from './configuration-by-key.interface';
import { appendAccessTokenToEmbedUrl, getBulkUploadEmbedUrl } from './bulk-upload-config.interface';

describe('getBulkUploadEmbedUrl', () => {
  it('returns null when data is undefined', () => {
    expect(getBulkUploadEmbedUrl(undefined)).toBeNull();
  });

  it('returns null when data is null', () => {
    expect(getBulkUploadEmbedUrl(null)).toBeNull();
  });

  it('returns null when simple_value is not a string', () => {
    expect(getBulkUploadEmbedUrl({ simple_value: 1, json_value: null } as unknown as ConfigurationByKeyResponse)).toBeNull();
  });

  it('returns null when simple_value is only whitespace', () => {
    expect(getBulkUploadEmbedUrl({ simple_value: '   ', json_value: null } as ConfigurationByKeyResponse)).toBeNull();
  });

  it('returns trimmed URL when simple_value is valid', () => {
    expect(
      getBulkUploadEmbedUrl({
        simple_value: '  https://example.com/path  ',
        json_value: null
      } as ConfigurationByKeyResponse)
    ).toBe('https://example.com/path');
  });
});

describe('appendAccessTokenToEmbedUrl', () => {
  it('appends access_token query param', () => {
    const out = appendAccessTokenToEmbedUrl('https://cdn.example.com/app', 'token-abc');
    expect(out).toContain('access_token=token-abc');
    expect(out.startsWith('https://cdn.example.com/app')).toBe(true);
  });

  it('merges with existing query string', () => {
    const out = appendAccessTokenToEmbedUrl('https://cdn.example.com/app?x=1', 'tok');
    const u = new URL(out);
    expect(u.searchParams.get('x')).toBe('1');
    expect(u.searchParams.get('access_token')).toBe('tok');
  });
});
