import { TestBed } from '@angular/core/testing';
import { GetScienceProgramsService } from './get-science-programs.service';
import { ApiService } from '../api.service';

describe('GetScienceProgramsService', () => {
  const setup = (impl: jest.Mock) => {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { GET_SciencePrograms: impl } }] });
    return TestBed.inject(GetScienceProgramsService);
  };

  it('loads and filters out inactive programs', async () => {
    const service = setup(jest.fn().mockResolvedValue({ data: [{ id: 1, is_active: true }, { id: 2, is_active: false }, { id: 3 }, null] }));
    await service.main();
    expect(service.list()).toEqual([{ id: 1, is_active: true }, { id: 3 }, null]);
    expect(service.loading()).toBe(false);
  });

  it('uses an empty list when data is not an array', async () => {
    const service = setup(jest.fn().mockResolvedValue({ data: null }));
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('uses an empty list when response is undefined', async () => {
    const service = setup(jest.fn().mockResolvedValue(undefined));
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('empties the list on error', async () => {
    const service = setup(jest.fn().mockRejectedValue(new Error('x')));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
