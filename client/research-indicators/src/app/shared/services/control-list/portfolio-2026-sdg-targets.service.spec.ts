import { TestBed } from '@angular/core/testing';
import { Portfolio2026SdgTargetsService } from './portfolio-2026-sdg-targets.service';
import { ApiService } from '../api.service';

describe('Portfolio2026SdgTargetsService', () => {
  const setup = (targets: jest.Mock, config: jest.Mock) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { GET_ClarisaSdgTargets: targets, GET_Portfolio2026SdgTargets: config } }]
    });
    return TestBed.inject(Portfolio2026SdgTargetsService);
  };
  const rows = [
    { id: 3, sdg_target_code: '12.1', sdg_target: 'Twelve' },
    { id: 1, sdg_target_code: '2.2', sdg_target: 'Two' },
    { id: 2, sdg_target_code: '9.9', sdg_target: '' },
    { id: 4, sdg_target_code: '1.1', sdg_target: 'One' }
  ];

  it('exposes accessors', () => {
    const service = setup(jest.fn(), jest.fn());
    expect(service.isOpenSearch()).toBe(false);
    expect(service.getList()).toBe(service.list);
    expect(service.getLoading()).toBe(service.loading);
  });

  it('falls back to default codes, maps and sorts numerically when config fails', async () => {
    const service = setup(jest.fn().mockResolvedValue({ data: rows }), jest.fn().mockRejectedValue(new Error('x')));
    await service.main();
    expect(service.list().map(r => r.sdg_target_code)).toEqual(['1.1', '2.2', '12.1']);
    expect(service.list()[0]).toMatchObject({ sdg_target_id: 4, select_label: '1.1 — One' });
    expect(service.loading()).toBe(false);
  });

  it('uses configured codes when provided', async () => {
    const service = setup(jest.fn().mockResolvedValue({ data: rows }), jest.fn().mockResolvedValue({ data: { codes: ['9.9', 2.2] } }));
    await service.main();
    expect(service.list().map(r => r.sdg_target_code)).toEqual(['2.2', '9.9']);
    expect(service.list()[1].select_label).toBe('9.9');
  });

  it('handles non-array rows', async () => {
    const service = setup(jest.fn().mockResolvedValue(undefined), jest.fn().mockResolvedValue(undefined));
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('empties list on error', async () => {
    const service = setup(jest.fn().mockRejectedValue(new Error('x')), jest.fn().mockResolvedValue(null));
    service.list.set([{ sdg_target_code: 'a' } as never]);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
