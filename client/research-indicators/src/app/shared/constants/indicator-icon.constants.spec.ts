import { getIndicatorIcon, IndicatorIconResult } from './indicator-icon.constants';

describe('indicator-icon.constants', () => {
  describe('getIndicatorIcon', () => {
    it('should return default icon and green color for indicatorId 1', () => {
      const result = getIndicatorIcon(undefined, 1);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#7CB580'
      });
    });

    it('should return default icon and green color for indicatorId 2', () => {
      const result = getIndicatorIcon(undefined, 2);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#7CB580'
      });
    });

    it('should return default icon and green color for indicatorId 3', () => {
      const result = getIndicatorIcon(undefined, 3);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#7CB580'
      });
    });

    it('should return default icon and orange color for indicatorId 4', () => {
      const result = getIndicatorIcon(undefined, 4);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#F58220'
      });
    });

    it('should return default icon and orange color for indicatorId 5', () => {
      const result = getIndicatorIcon(undefined, 5);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#F58220'
      });
    });

    it('should return custom icon with pi prefix and green color for indicatorId 1', () => {
      const result = getIndicatorIcon('pi-users', 1);
      expect(result).toEqual({
        icon: 'pi pi-users',
        color: '#7CB580'
      });
    });

    it('should return custom icon with pi prefix and green color for indicatorId 2', () => {
      const result = getIndicatorIcon('pi-folder', 2);
      expect(result).toEqual({
        icon: 'pi pi-folder',
        color: '#7CB580'
      });
    });

    it('should return custom icon with pi prefix and orange color for indicatorId 4', () => {
      const result = getIndicatorIcon('pi-star', 4);
      expect(result).toEqual({
        icon: 'pi pi-star',
        color: '#F58220'
      });
    });

    it('should return default icon and orange color when indicatorId is undefined', () => {
      const result = getIndicatorIcon(undefined, undefined);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#F58220'
      });
    });

    it('should return custom icon and orange color when indicatorId is undefined', () => {
      const result = getIndicatorIcon('pi-check', undefined);
      expect(result).toEqual({
        icon: 'pi pi-check',
        color: '#F58220'
      });
    });

    it('should return custom icon and green color when iconSrc is provided and indicatorId is 3', () => {
      const result = getIndicatorIcon('pi-science', 3);
      expect(result).toEqual({
        icon: 'pi pi-science',
        color: '#7CB580'
      });
    });

    it('should return default icon and orange color when iconSrc is empty string', () => {
      const result = getIndicatorIcon('', 5);
      expect(result).toEqual({
        icon: 'pi pi-circle',
        color: '#F58220'
      });
    });

    it('should return correct type IndicatorIconResult', () => {
      const result = getIndicatorIcon('pi-test', 1);
      expect(result).toHaveProperty('icon');
      expect(result).toHaveProperty('color');
      expect(typeof result.icon).toBe('string');
      expect(typeof result.color).toBe('string');
    });
  });
});

