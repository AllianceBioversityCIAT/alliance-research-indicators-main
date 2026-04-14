import { Router } from 'express';
import { searchPaternPath } from './router.util';

describe('router.util', () => {
  describe('searchPaternPath', () => {
    it('should find first non-root matching layer with route path', () => {
      const router = Router();
      router.get('/api/foo', (_req, _res) => undefined);

      const rootRegex = '/^\\/(.*)\\/?$/i';
      const matched = router.stack.find(
        (layer) =>
          `${layer.regexp}` !== rootRegex &&
          layer.regexp.test('/api/foo') &&
          layer.route?.path,
      );

      const viaUtil = searchPaternPath(router, '/api/foo');
      expect(viaUtil).toEqual(matched);
    });
  });
});
