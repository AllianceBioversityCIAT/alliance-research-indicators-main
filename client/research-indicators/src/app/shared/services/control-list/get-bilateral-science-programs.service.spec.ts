import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GetBilateralScienceProgramsService } from './get-bilateral-science-programs.service';
import { BilateralService } from '../bilateral.service';
import { CacheService } from '../cache/cache.service';
import { PoolFundingMappingStatus, PoolFundingScienceProgram } from '@interfaces/bilateral/pool-funding-alignment.interface';

describe('GetBilateralScienceProgramsService', () => {
  let service: GetBilateralScienceProgramsService;
  let sciencePrograms: ReturnType<typeof signal<PoolFundingScienceProgram[]>>;
  let mappingStatus: ReturnType<typeof signal<PoolFundingMappingStatus | null>>;
  let loadingSciencePrograms: ReturnType<typeof signal<boolean>>;
  let numericId: ReturnType<typeof signal<number>>;
  let getSciencePrograms: jest.Mock;

  beforeEach(() => {
    sciencePrograms = signal<PoolFundingScienceProgram[]>([]);
    mappingStatus = signal<PoolFundingMappingStatus | null>(null);
    loadingSciencePrograms = signal<boolean>(false);
    numericId = signal<number>(19792);
    getSciencePrograms = jest.fn().mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        GetBilateralScienceProgramsService,
        {
          provide: BilateralService,
          useValue: { sciencePrograms, mappingStatus, loadingSciencePrograms, getSciencePrograms }
        },
        { provide: CacheService, useValue: { getCurrentNumericResultId: () => numericId() } }
      ]
    });
    service = TestBed.inject(GetBilateralScienceProgramsService);
  });

  it('maps per-result SPs into picker options carrying official_code (AC-01.7 form contract)', () => {
    sciencePrograms.set([
      { code: 'SP09', name: 'Scaling for Impact', category: 'Scaling programs', color: '#ec4899', icon_key: 'SP09', allocation: 25 }
    ]);
    TestBed.flushEffects();

    expect(service.list()).toEqual([
      {
        code: 'SP09',
        official_code: 'SP09',
        name: 'Scaling for Impact',
        category: 'Scaling programs',
        color: '#ec4899',
        icon_key: 'SP09',
        allocation: 25
      }
    ]);
  });

  it('mirrors the BilateralService loading signal', () => {
    expect(service.loading()).toBe(false);
    loadingSciencePrograms.set(true);
    expect(service.loading()).toBe(true);
  });

  it('main() delegates to BilateralService.getSciencePrograms with the numeric result code', async () => {
    await service.main();
    expect(getSciencePrograms).toHaveBeenCalledWith('19792');
  });

  it('main() skips a redundant round-trip when already loaded for the same result', async () => {
    await service.main();
    mappingStatus.set('mapped');
    getSciencePrograms.mockClear();

    await service.main();

    expect(getSciencePrograms).not.toHaveBeenCalled();
  });

  it('main() is a no-op when there is no result code', async () => {
    numericId.set(0);
    await service.main();
    expect(getSciencePrograms).not.toHaveBeenCalled();
  });

  it('main() delegates to BilateralService.getSciencePrograms even while a load is in flight (deduped server-side)', async () => {
    loadingSciencePrograms.set(true);
    await service.main();
    expect(getSciencePrograms).toHaveBeenCalledWith('19792');
  });
});
