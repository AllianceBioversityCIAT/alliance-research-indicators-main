import { DataSource } from 'typeorm';
import { EnvAppConfigUtil } from './env-app-config.util';
import { CgiarLogger } from './cgiar-logs/logs.util';

describe('EnvAppConfigUtil', () => {
  let errorSpy: jest.SpyInstance;

  const buildUtil = (findOneResult: unknown): EnvAppConfigUtil => {
    const findOne = jest.fn().mockResolvedValue(findOneResult);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    } as unknown as DataSource;
    return new EnvAppConfigUtil(dataSource);
  };

  beforeEach(() => {
    // Spy on the prototype: EnvAppConfigUtil builds its own CgiarLogger
    // instance internally (not injected), so this is the only seam that
    // catches a call regardless of which instance made it.
    errorSpy = jest.spyOn(CgiarLogger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  // Same reading as the client's isFeatureFlagEnabled: on unless "false".
  describe('POOL_FUNDING_SECTION_ENABLED', () => {
    it.each([
      ['false', false],
      [' FALSE ', false],
      ['true', true],
      ['', true],
      [null, true],
    ])('simple_value %p -> %p', async (value, expected) => {
      const util = buildUtil({ simple_value: value });
      await expect(util.POOL_FUNDING_SECTION_ENABLED()).resolves.toBe(expected);
    });

    it('absent row or a failed read: open (fail-open, as the client), never an error log', async () => {
      await expect(
        buildUtil(null).POOL_FUNDING_SECTION_ENABLED(),
      ).resolves.toBe(true);
      const findOne = jest.fn().mockRejectedValue(new Error('db down'));
      const util = new EnvAppConfigUtil({
        getRepository: jest.fn().mockReturnValue({ findOne }),
      } as unknown as DataSource);
      const warnSpy = jest
        .spyOn(CgiarLogger.prototype, 'warn')
        .mockImplementation();
      await expect(util.POOL_FUNDING_SECTION_ENABLED()).resolves.toBe(true);
      // open, but never silently: the failed read is a warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('POOL_FUNDING.SECTION.ENABLED'),
      );
      warnSpy.mockRestore();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('reads the POOL_FUNDING.SECTION.ENABLED key', async () => {
      const findOne = jest.fn().mockResolvedValue({ simple_value: 'true' });
      const util = new EnvAppConfigUtil({
        getRepository: jest.fn().mockReturnValue({ findOne }),
      } as unknown as DataSource);
      await util.POOL_FUNDING_SECTION_ENABLED();
      expect(findOne.mock.calls[0][0].where.key).toBe(
        'POOL_FUNDING.SECTION.ENABLED',
      );
    });
  });

  describe('CAPDEV_BULK_UPLOAD_ENABLED', () => {
    it('returns {value: false, defaulted: true} when the row is absent, and neither throws nor logs an error', async () => {
      const util = buildUtil(null);
      let caught: unknown = null;
      let result: { value: boolean; defaulted: boolean } | undefined;

      try {
        result = await util.CAPDEV_BULK_UPLOAD_ENABLED();
      } catch (error) {
        caught = error;
      }

      // The disqualifying condition this task exists to prevent: a
      // try/catch around the throwing `getConfig` would still produce
      // the same returned value while an ERROR log line escaped first.
      // Both assertions below are required for that reason.
      expect(caught).toBeNull();
      expect(result).toEqual({ value: false, defaulted: true });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('returns {value: false, defaulted: false} when the row is present with simple_value "false"', async () => {
      const util = buildUtil({ simple_value: 'false' });

      const result = await util.CAPDEV_BULK_UPLOAD_ENABLED();

      expect(result).toEqual({ value: false, defaulted: false });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('returns {value: true, defaulted: false} when the row is present with simple_value "true"', async () => {
      const util = buildUtil({ simple_value: 'true' });

      const result = await util.CAPDEV_BULK_UPLOAD_ENABLED();

      expect(result).toEqual({ value: true, defaulted: false });
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('CAPDEV_BULK_UPLOAD_CC_EMAIL', () => {
    it('returns {value: [], defaulted: true} when the row is absent, and neither throws nor logs an error', async () => {
      const util = buildUtil(null);
      let caught: unknown = null;
      let result: { value: string[]; defaulted: boolean } | undefined;

      try {
        result = await util.CAPDEV_BULK_UPLOAD_CC_EMAIL();
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeNull();
      expect(result).toEqual({ value: [], defaulted: true });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('trims entries and returns {value: [...], defaulted: false} when the row is present with a comma-separated list', async () => {
      const util = buildUtil({ simple_value: 'a@x.org, b@y.org ' });

      const result = await util.CAPDEV_BULK_UPLOAD_CC_EMAIL();

      expect(result).toEqual({
        value: ['a@x.org', 'b@y.org'],
        defaulted: false,
      });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('returns {value: [], defaulted: false} when the row is present but empty — seeded-but-empty is distinct from absent', async () => {
      const util = buildUtil({ simple_value: '' });

      const result = await util.CAPDEV_BULK_UPLOAD_CC_EMAIL();

      expect(result).toEqual({ value: [], defaulted: false });
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
