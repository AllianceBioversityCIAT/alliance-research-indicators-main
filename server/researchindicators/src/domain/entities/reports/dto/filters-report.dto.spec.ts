import { ResultSortEnum } from '../../results/enum/result-sort.enum';
import {
  emptyFullFiltersReportDto,
  mergeFullFiltersReportDto,
  type FullFiltersReportDto,
} from './filters-report.dto';

describe('filters-report.dto', () => {
  describe('emptyFullFiltersReportDto', () => {
    it('returns defaults aligned with Result Center', () => {
      const dto = emptyFullFiltersReportDto();
      expect(dto.filters.search).toBe('');
      expect(dto.filters.statusCodes).toEqual([]);
      expect(dto.filters.onlyOwnResults).toBe(false);
      expect(dto.filters.currentUserId).toBeUndefined();
      expect(dto.filters.currentUserDisplayName).toBeUndefined();
      expect(dto.sorting.sortOrder).toBe('DESC');
      expect(dto.sorting.sortField).toBe(ResultSortEnum.CODE);
    });
  });

  describe('mergeFullFiltersReportDto', () => {
    it('merges partial filters and sorting over defaults', () => {
      const partial: FullFiltersReportDto = {
        filters: {
          search: 'foo',
          statusCodes: [],
          contractCodes: [],
          years: [],
          platformCode: [],
          indicators: [],
          onlyOwnResults: true,
          currentUserId: 42,
        },
        sorting: { sortOrder: 'ASC', sortField: ResultSortEnum.RESULT_TITLE },
      };
      const merged = mergeFullFiltersReportDto(partial);
      expect(merged.filters.search).toBe('foo');
      expect(merged.filters.onlyOwnResults).toBe(true);
      expect(merged.filters.currentUserId).toBe(42);
      expect(merged.sorting.sortOrder).toBe('ASC');
      expect(merged.sorting.sortField).toBe(ResultSortEnum.RESULT_TITLE);
    });

    it('fills omitted filter keys from defaults', () => {
      const merged = mergeFullFiltersReportDto({
        filters: {
          search: '',
          statusCodes: [],
          contractCodes: [],
          years: [],
          platformCode: [],
          indicators: [],
          onlyOwnResults: false,
        },
        sorting: { sortOrder: 'DESC', sortField: ResultSortEnum.CODE },
      });
      expect(merged.filters.currentUserId).toBeUndefined();
    });
  });
});
