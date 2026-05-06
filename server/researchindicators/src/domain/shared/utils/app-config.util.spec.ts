import { DataSource } from 'typeorm';
import { AppConfig } from './app-config.util';

describe('AppConfig', () => {
  const prev = { ...process.env };
  const dataSource = {} as DataSource;

  afterEach(() => {
    process.env = { ...prev };
  });

  it('reads boolean and numeric env flags', () => {
    process.env.ARI_PORT = '3000';
    process.env.ARI_IS_PRODUCTION = 'true';
    process.env.ARI_SEE_ALL_LOGS = 'false';
    const cfg = new AppConfig(dataSource);
    expect(cfg.ARI_PORT).toBe(3000);
    expect(cfg.ARI_IS_PRODUCTION).toBe(true);
    expect(cfg.ARI_SEE_ALL_LOGS).toBe(false);
  });

  it('exposes raw string env values', () => {
    process.env.ARI_MQ_HOST = 'amqp://local';
    process.env.ARI_JWT_ACCESS_EXPIRES_IN = '1h';
    const cfg = new AppConfig(dataSource);
    expect(cfg.ARI_MQ_HOST).toBe('amqp://local');
    expect(cfg.ARI_JWT_ACCESS_EXPIRES_IN).toBe('1h');
  });

  it('maps every documented env var through getters and helpers', () => {
    process.env.ARI_MQ_HOST = 'mq-host';
    process.env.ARI_MQ_USER = 'mq-user';
    process.env.ARI_MQ_PASSWORD = 'mq-pass';
    process.env.ARI_PORT = '8080';
    process.env.ARI_IS_PRODUCTION = 'false';
    process.env.ARI_SEE_ALL_LOGS = 'true';
    process.env.ARI_JWT_ACCESS_EXPIRES_IN = '2h';
    process.env.ARI_CLARISA_HOST = 'clarisa';
    process.env.ARI_CLARISA_USER = 'cu';
    process.env.ARI_CLARISA_PASS = 'cp';
    process.env.ARI_MYSQL_HOST = 'mh';
    process.env.ARI_MYSQL_USER_NAME = 'mu';
    process.env.ARI_MYSQL_USER_PASS = 'mp';
    process.env.ARI_MYSQL_NAME = 'mdb';
    process.env.ARI_SECONDARY_MYSQL_NAME = 'mdb2';
    process.env.ARI_QUEUE_SECONDARY = 'qsec';
    process.env.ARI_QUEUE_AI = 'qai';
    process.env.ARI_QUEUE = 'q';
    process.env.ARI_TEST_MYSQL_HOST = 'th';
    process.env.ARI_TEST_MYSQL_USER_NAME = 'tu';
    process.env.ARI_TEST_MYSQL_USER_PASS = 'tp';
    process.env.ARI_TEST_MYSQL_NAME = 'tn';
    process.env.ARI_AGRESSO_URL = 'ag-url';
    process.env.ARI_AGRESSO_USER = 'ag-u';
    process.env.ARI_AGRESSO_PASS = 'ag-p';
    process.env.ARI_APP_NAME = 'app';
    process.env.ARI_MIS = 'mis';
    process.env.ARI_MIS_ENV = 'mis-env';
    process.env.ARI_OPENSEARCH_URL = 'os-url';
    process.env.ARI_OPENSEARCH_USERNAME = 'os-u';
    process.env.ARI_OPENSEARCH_PASSWORD = 'os-p';
    process.env.ARI_OPENSEARCH_BASE_INDEX = 'idx';
    process.env.ARI_ROAR_MANAGEMENT_HOST = 'roar';
    process.env.ARI_MS_MESSAGE_SECRET = 'sec';
    process.env.ARI_MS_MESSAGE_CLIENT_ID = 'cid';
    process.env.ARI_FROM_EMAIL = 'from@x';
    process.env.ARI_FROM_EMAIL_NAME = 'From';
    process.env.ARI_MESSAGE_QUEUE = 'mq';
    process.env.ARI_CLIENT_HOST = 'https://client';
    process.env.ARI_SUPPORT_EMAIL = 'sup@x';
    process.env.ARI_CONTENT_SUPPORT_EMAIL = 'cs@x';
    process.env.ARI_TECHNICAL_SUPPORT = 'tech@x';
    process.env.ARI_CONTENT_SUPPORT = 'content@x';
    process.env.ARI_SALT = '9';
    process.env.ARI_BUCKET_URL = 's3://b';
    process.env.ARI_SPRM_EMAIL = 'sprm@x';
    process.env.ARI_MAPPED_BCC_SUBM_OICR = 'a@x,b@x';
    process.env.ARI_PI_EMAIL = 'pi1@x,pi2@x';
    process.env.ARI_TIP_API_URL = 'tip';
    process.env.ARI_TIP_TOKEN = 'tok';

    const cfg = new AppConfig(dataSource);

    expect(cfg.ARI_MQ_HOST).toBe('mq-host');
    expect(cfg.ARI_MQ_USER).toBe('mq-user');
    expect(cfg.ARI_MQ_PASSWORD).toBe('mq-pass');
    expect(cfg.ARI_PORT).toBe(8080);
    expect(cfg.ARI_IS_PRODUCTION).toBe(false);
    expect(cfg.ARI_SEE_ALL_LOGS).toBe(true);
    expect(cfg.ARI_JWT_ACCESS_EXPIRES_IN).toBe('2h');
    expect(cfg.ARI_CLARISA_HOST).toBe('clarisa');
    expect(cfg.ARI_CLARISA_USER).toBe('cu');
    expect(cfg.ARI_CLARISA_PASS).toBe('cp');
    expect(cfg.ARI_MYSQL_HOST).toBe('mh');
    expect(cfg.ARI_MYSQL_USER_NAME).toBe('mu');
    expect(cfg.ARI_MYSQL_USER_PASS).toBe('mp');
    expect(cfg.ARI_MYSQL_NAME).toBe('mdb');
    expect(cfg.ARI_SECONDARY_MYSQL_NAME).toBe('mdb2');
    expect(cfg.ARI_QUEUE_SECONDARY).toBe('qsec');
    expect(cfg.ARI_QUEUE_AI).toBe('qai');
    expect(cfg.ARI_QUEUE).toBe('q');
    expect(cfg.ARI_TEST_MYSQL_HOST).toBe('th');
    expect(cfg.ARI_TEST_MYSQL_USER_NAME).toBe('tu');
    expect(cfg.ARI_TEST_MYSQL_USER_PASS).toBe('tp');
    expect(cfg.ARI_TEST_MYSQL_NAME).toBe('tn');
    expect(cfg.ARI_AGRESSO_URL).toBe('ag-url');
    expect(cfg.ARI_AGRESSO_USER).toBe('ag-u');
    expect(cfg.ARI_AGRESSO_PASS).toBe('ag-p');
    expect(cfg.ARI_APP_NAME).toBe('app');
    expect(cfg.ARI_MIS).toBe('mis');
    expect(cfg.ARI_MIS_ENV).toBe('mis-env');
    expect(cfg.OPEN_SEARCH_URL).toBe('os-url');
    expect(cfg.OPEN_SEARCH_USER).toBe('os-u');
    expect(cfg.OPEN_SEARCH_PASS).toBe('os-p');
    expect(cfg.OPEN_SEARCH_BASE_INDEX).toBe('idx');
    expect(cfg.ROAR_MANAGEMENT_HOST).toBe('roar');
    expect(cfg.ARI_MS_MESSAGE_SECRET).toBe('sec');
    expect(cfg.ARI_MS_MESSAGE_CLIENT_ID).toBe('cid');
    expect(cfg.ARI_FROM_EMAIL).toBe('from@x');
    expect(cfg.ARI_FROM_EMAIL_NAME).toBe('From');
    expect(cfg.ARI_MESSAGE_QUEUE).toBe('mq');
    expect(cfg.ARI_CLIENT_HOST).toBe('https://client');
    expect(cfg.ARI_SUPPORT_EMAIL).toBe('sup@x');
    expect(cfg.ARI_CONTENT_SUPPORT_EMAIL).toBe('cs@x');
    expect(cfg.TECHNICAL_SUPPORT).toBe('tech@x');
    expect(cfg.CONTENT_SUPPORT).toBe('content@x');
    expect(cfg.SALT).toBe(9);
    expect(cfg.BUCKET_URL).toBe('s3://b');
    expect(cfg.SPRM_EMAIL).toBe('sprm@x');
    expect(cfg.SPRM_EMAIL_ARRAY).toEqual(['sprm@x']);
    expect(cfg.INTERNAL_EMAIL_LIST).toBe('a@x,b@x');
    expect(cfg.INTERNAL_EMAIL_LIST_ARRAY).toEqual(['a@x', 'b@x']);
    expect(cfg.PRINCIPAL_INVESTIGATOR_EMAIL_ARRAY).toEqual(['pi1@x', 'pi2@x']);
    expect(cfg.TIP_API_URL).toBe('tip');
    expect(cfg.TIP_TOKEN).toBe('tok');

    expect(cfg.COMPLETE_CLIENT_HOST('/path')).toBe('https://client/path');
    expect(cfg.SPRM_EMAIL_SAFE('user@x')).toBe('user@x');
    expect(cfg.SET_SAFE_EMAIL('a@x', 'b@x')).toBe('b@x');
  });

  it('SPRM_EMAIL_SAFE and SET_SAFE_EMAIL use production env when ARI_IS_PRODUCTION is true', () => {
    process.env.ARI_IS_PRODUCTION = 'true';
    process.env.ARI_SPRM_EMAIL = 'prod@x';
    const cfg = new AppConfig(dataSource);
    expect(cfg.SPRM_EMAIL_SAFE('user@x')).toBe('prod@x');
    expect(cfg.SET_SAFE_EMAIL('real@x', 'alt@x')).toBe('real@x');
  });

  it('DB_SUPPORT_EMAIL returns simple_value from app_config for ARI_SUPPORT_EMAIL key', async () => {
    const findOne = jest.fn().mockResolvedValue({ simple_value: 'db-support@example.com' });
    const ds = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    } as unknown as DataSource;
    const cfg = new AppConfig(ds);
    await expect(cfg.DB_SUPPORT_EMAIL()).resolves.toBe('db-support@example.com');
    expect(findOne).toHaveBeenCalledWith({
      where: { key: 'ARI_SUPPORT_EMAIL' },
    });
  });

  it('DB_SUPPORT_EMAIL resolves to undefined when no matching app_config row', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const ds = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    } as unknown as DataSource;
    const cfg = new AppConfig(ds);
    await expect(cfg.DB_SUPPORT_EMAIL()).resolves.toBeUndefined();
  });
});
