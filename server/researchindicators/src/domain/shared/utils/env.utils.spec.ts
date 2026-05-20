import { ENV } from './env.utils';

describe('ENV', () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  it('IS_PRODUCTION is true only when env string is true', () => {
    process.env.ARI_IS_PRODUCTION = 'true';
    expect(ENV.IS_PRODUCTION).toBe(true);
    process.env.ARI_IS_PRODUCTION = 'false';
    expect(ENV.IS_PRODUCTION).toBe(false);
  });

  it('SEE_ALL_LOGS mirrors ARI_SEE_ALL_LOGS', () => {
    process.env.ARI_SEE_ALL_LOGS = 'true';
    expect(ENV.SEE_ALL_LOGS).toBe(true);
  });

  it('bilateral feature flags default to false', () => {
    delete process.env.ARI_BILATERAL_MODULE_ENABLED;
    delete process.env.ARI_BILATERAL_PUSH_ENABLED;
    delete process.env.ARI_BILATERAL_W3_SYNC_ENABLED;
    delete process.env.ARI_BILATERAL_SP_TOC_SYNC_ENABLED;

    expect(ENV.BILATERAL_MODULE_ENABLED).toBe(false);
    expect(ENV.BILATERAL_PUSH_ENABLED).toBe(false);
    expect(ENV.BILATERAL_W3_SYNC_ENABLED).toBe(false);
    expect(ENV.BILATERAL_SP_TOC_SYNC_ENABLED).toBe(false);
  });

  it('bilateral feature flags are true only when env string is true', () => {
    process.env.ARI_BILATERAL_MODULE_ENABLED = 'true';
    process.env.ARI_BILATERAL_PUSH_ENABLED = 'true';
    process.env.ARI_BILATERAL_W3_SYNC_ENABLED = 'true';
    process.env.ARI_BILATERAL_SP_TOC_SYNC_ENABLED = 'TRUE';

    expect(ENV.BILATERAL_MODULE_ENABLED).toBe(true);
    expect(ENV.BILATERAL_PUSH_ENABLED).toBe(true);
    expect(ENV.BILATERAL_W3_SYNC_ENABLED).toBe(true);
    expect(ENV.BILATERAL_SP_TOC_SYNC_ENABLED).toBe(false);
  });
});
