import { AppConfig } from './app-config.util';

describe('AppConfig', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('reads boolean and numeric env flags', () => {
    process.env.ARI_PORT = '3000';
    process.env.ARI_IS_PRODUCTION = 'true';
    process.env.ARI_SEE_ALL_LOGS = 'false';
    const cfg = new AppConfig();
    expect(cfg.ARI_PORT).toBe(3000);
    expect(cfg.ARI_IS_PRODUCTION).toBe(true);
    expect(cfg.ARI_SEE_ALL_LOGS).toBe(false);
  });

  it('exposes raw string env values', () => {
    process.env.ARI_MQ_HOST = 'amqp://local';
    process.env.ARI_JWT_ACCESS_EXPIRES_IN = '1h';
    const cfg = new AppConfig();
    expect(cfg.ARI_MQ_HOST).toBe('amqp://local');
    expect(cfg.ARI_JWT_ACCESS_EXPIRES_IN).toBe('1h');
  });
});
