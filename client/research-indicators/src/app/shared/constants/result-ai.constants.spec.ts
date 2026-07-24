import { EXPANDED_ITEM_DETAILS, INDICATOR_TYPE_ICONS, getIndicatorTypeIcon } from './result-ai.constants';

describe('result-ai.constants', () => {
  describe('EXPANDED_ITEM_DETAILS', () => {
    it('should have correct structure and values', () => {
      expect(EXPANDED_ITEM_DETAILS).toHaveLength(4);

      expect(EXPANDED_ITEM_DETAILS[0]).toEqual({
        title: 'Total participants',
        value: 'total_participants'
      });

      expect(EXPANDED_ITEM_DETAILS[1]).toEqual({
        title: 'Non-binary',
        value: 'non_binary_participants'
      });

      expect(EXPANDED_ITEM_DETAILS[2]).toEqual({
        title: 'Female',
        value: 'female_participants'
      });

      expect(EXPANDED_ITEM_DETAILS[3]).toEqual({
        title: 'Male',
        value: 'male_participants'
      });
    });
  });

  describe('INDICATOR_TYPE_ICONS', () => {
    it('should have correct structure and values', () => {
      expect(INDICATOR_TYPE_ICONS).toHaveLength(6);

      expect(INDICATOR_TYPE_ICONS[0]).toEqual({
        icon: 'group',
        type: 'Capacity Sharing for Development',
        class: 'output-icon'
      });

      expect(INDICATOR_TYPE_ICONS[1]).toEqual({
        icon: 'flag',
        type: 'Innovation Development',
        class: 'output-icon'
      });

      expect(INDICATOR_TYPE_ICONS[2]).toEqual({
        icon: 'lightbulb',
        type: 'Knowledge Product',
        class: 'output-icon'
      });

      expect(INDICATOR_TYPE_ICONS[3]).toEqual({
        icon: 'wb_sunny',
        type: 'Innovation Use',
        class: 'outcome-icon'
      });

      expect(INDICATOR_TYPE_ICONS[4]).toEqual({
        icon: 'pie_chart',
        type: 'Research Output',
        class: 'outcome-icon'
      });

      expect(INDICATOR_TYPE_ICONS[5]).toEqual({
        icon: 'folder_open',
        type: 'Policy Change',
        class: 'outcome-icon'
      });
    });
  });

  describe('getIndicatorTypeIcon', () => {
    it('should return correct icon for Capacity Sharing for Development', () => {
      const result = getIndicatorTypeIcon('Capacity Sharing for Development');
      expect(result).toEqual({
        class: 'output-icon',
        icon: 'group'
      });
    });

    it('should return correct icon for Innovation Development', () => {
      const result = getIndicatorTypeIcon('Innovation Development');
      expect(result).toEqual({
        class: 'output-icon',
        icon: 'flag'
      });
    });

    it('should return correct icon for Knowledge Product', () => {
      const result = getIndicatorTypeIcon('Knowledge Product');
      expect(result).toEqual({
        class: 'output-icon',
        icon: 'lightbulb'
      });
    });

    it('should return correct icon for Innovation Use', () => {
      const result = getIndicatorTypeIcon('Innovation Use');
      expect(result).toEqual({
        class: 'outcome-icon',
        icon: 'wb_sunny'
      });
    });

    it('should return correct icon for Research Output', () => {
      const result = getIndicatorTypeIcon('Research Output');
      expect(result).toEqual({
        class: 'outcome-icon',
        icon: 'pie_chart'
      });
    });

    it('should return correct icon for Policy Change', () => {
      const result = getIndicatorTypeIcon('Policy Change');
      expect(result).toEqual({
        class: 'outcome-icon',
        icon: 'folder_open'
      });
    });

    it('should return undefined values for unknown type', () => {
      const result = getIndicatorTypeIcon('Unknown Type');
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });

    it('should return undefined values for empty string', () => {
      const result = getIndicatorTypeIcon('');
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });

    it('should return undefined values for null type', () => {
      const result = getIndicatorTypeIcon(null as any);
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });

    it('should return undefined values for undefined type', () => {
      const result = getIndicatorTypeIcon(undefined as any);
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });

    it('should be case sensitive', () => {
      const result = getIndicatorTypeIcon('capacity sharing for development');
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });

    it('should handle partial matches', () => {
      const result = getIndicatorTypeIcon('Capacity Sharing');
      expect(result).toEqual({
        class: undefined,
        icon: undefined
      });
    });
  });
});
