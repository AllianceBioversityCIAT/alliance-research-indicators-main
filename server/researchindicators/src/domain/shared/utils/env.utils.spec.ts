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
});
