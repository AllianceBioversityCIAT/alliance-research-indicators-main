import { TestBed } from '@angular/core/testing';
import { ApiService } from '../api.service';
import { GetOicrAudiencesService } from './get-oicr-audiences.service';
import { GetOicrThematicKeywordsService } from './get-oicr-thematic-keywords.service';
import { GetQuantificationUnitCategoriesService } from './get-quantification-unit-categories.service';

describe('OICR 2026 catalog services', () => {
  const setup = (api: Partial<Record<keyof ApiService, jest.Mock>>) => {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
  };

  afterEach(() => TestBed.resetTestingModule());

  it('audiences: maps id to oicr_audience_id so the multiselect can key on the saved selection', async () => {
    const GET_OicrAudiences = jest.fn().mockResolvedValue({ data: [{ id: 3, name: 'Research' }] });
    setup({ GET_OicrAudiences });
    const service = TestBed.inject(GetOicrAudiencesService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([{ id: 3, name: 'Research', oicr_audience_id: 3 }]);
    expect(service.loading()).toBe(false);
  });

  it('audiences: an error leaves an empty list', async () => {
    setup({ GET_OicrAudiences: jest.fn().mockRejectedValue(new Error('x')) });
    const service = TestBed.inject(GetOicrAudiencesService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('thematic keywords: maps id to oicr_thematic_keyword_id', async () => {
    setup({ GET_OicrThematicKeywords: jest.fn().mockResolvedValue({ data: [{ id: 9, name: 'Food Security' }] }) });
    const service = TestBed.inject(GetOicrThematicKeywordsService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([{ id: 9, name: 'Food Security', oicr_thematic_keyword_id: 9 }]);
  });

  it('thematic keywords: a non-array payload leaves an empty list', async () => {
    setup({ GET_OicrThematicKeywords: jest.fn().mockResolvedValue({ data: null }) });
    const service = TestBed.inject(GetOicrThematicKeywordsService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
  });

  it('unit categories: loads only when asked, and only once', async () => {
    const rows = [{ id: 1, macro_category: 'Individuals', name: 'Farmers', is_percentage: false }];
    const GET_QuantificationUnitCategories = jest.fn().mockResolvedValue({ data: rows });
    setup({ GET_QuantificationUnitCategories });
    const service = TestBed.inject(GetQuantificationUnitCategoriesService);
    expect(GET_QuantificationUnitCategories).not.toHaveBeenCalled();

    await service.main();
    await service.main();
    expect(GET_QuantificationUnitCategories).toHaveBeenCalledTimes(1);
    expect(service.list()).toEqual(rows);
  });

  it('unit categories: a failure keeps the list empty and allows a retry', async () => {
    const GET_QuantificationUnitCategories = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: [] });
    setup({ GET_QuantificationUnitCategories });
    const service = TestBed.inject(GetQuantificationUnitCategoriesService);
    await service.main();
    expect(service.list()).toEqual([]);
    await service.main();
    expect(GET_QuantificationUnitCategories).toHaveBeenCalledTimes(2);
  });
});
