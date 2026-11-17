import {
  mockBilateralMapping,
  mockBilateralMappingListPage,
  mockClarisaBilateralProjectOption
} from './bilateral-project-mapping.fixture';

describe('bilateral-project-mapping fixtures', () => {
  describe('mockBilateralMapping', () => {
    it('returns the default MANUAL mapping', () => {
      expect(mockBilateralMapping()).toEqual(
        expect.objectContaining({ id: 11, agresso_agreement_id: 'D504', source: 'MANUAL', is_active: true, confidence_score: null })
      );
    });

    it('applies overrides on top of the defaults', () => {
      const row = mockBilateralMapping({ id: 5, is_active: false });
      expect(row.id).toBe(5);
      expect(row.is_active).toBe(false);
      expect(row.clarisa_project_id).toBe(22);
    });
  });

  describe('mockBilateralMappingListPage', () => {
    it('defaults to a single-item page with derived meta', () => {
      const page = mockBilateralMappingListPage();
      expect(page.items).toHaveLength(1);
      expect(page.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('derives totalPages from the supplied total and limit', () => {
      const page = mockBilateralMappingListPage([mockBilateralMapping()], 45, 20);
      expect(page.meta).toEqual({ total: 45, page: 1, limit: 20, totalPages: 3 });
    });

    it('never reports fewer than one page for an empty list', () => {
      expect(mockBilateralMappingListPage([]).meta.totalPages).toBe(1);
    });
  });

  describe('mockClarisaBilateralProjectOption', () => {
    it('returns the default option with a science-program allocation', () => {
      const opt = mockClarisaBilateralProjectOption();
      expect(opt.id).toBe(22);
      expect(opt.science_programs?.[0]).toEqual(expect.objectContaining({ code: 'SP1', allocation: 60 }));
    });

    it('applies overrides', () => {
      expect(mockClarisaBilateralProjectOption({ id: 99, science_programs: [] })).toEqual(
        expect.objectContaining({ id: 99, science_programs: [] })
      );
    });
  });
});
