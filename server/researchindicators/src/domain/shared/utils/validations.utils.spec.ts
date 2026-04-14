import { nextToProcessAiRaw } from './validations.utils';

describe('validations.utils', () => {
  describe('nextToProcessAiRaw', () => {
    it('should return null for empty or Not collected', async () => {
      await expect(nextToProcessAiRaw('', async () => 1)).resolves.toBeNull();
      await expect(
        nextToProcessAiRaw('Not collected', async () => 1),
      ).resolves.toBeNull();
    });

    it('should call fn when value present', async () => {
      await expect(
        nextToProcessAiRaw('x', async (v) => v.toUpperCase()),
      ).resolves.toBe('X');
    });
  });
});
