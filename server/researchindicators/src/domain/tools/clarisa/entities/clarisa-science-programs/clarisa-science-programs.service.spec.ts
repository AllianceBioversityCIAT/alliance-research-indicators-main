import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClarisaScienceProgramsService } from './clarisa-science-programs.service';
import { ClarisaScienceProgram } from './entities/clarisa-science-program.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
//
// Backfills the sibling spec deferred in commit 5d48b27b. The service is a
// thin TypeORM read-only wrapper, so the spec asserts:
//   1. findAll forwards is_active+order options.
//   2. findByCode forwards the active filter.
//   3. findByCode returns null when the upstream returns null.

describe('ClarisaScienceProgramsService (T-15.6)', () => {
  let service: ClarisaScienceProgramsService;
  let repo: Pick<Repository<ClarisaScienceProgram>, 'find' | 'findOne'>;

  const find = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaScienceProgramsService,
        {
          provide: getRepositoryToken(ClarisaScienceProgram),
          useValue: { find, findOne },
        },
      ],
    }).compile();

    service = module.get(ClarisaScienceProgramsService);
    repo = module.get(getRepositoryToken(ClarisaScienceProgram));
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll filters to active rows and sorts by official_code ASC', async () => {
    const rows = [
      { official_code: 'SP01', name: 'Breeding for Tomorrow', is_active: true },
      { official_code: 'SP02', name: 'Sustainable Farming', is_active: true },
    ] as ClarisaScienceProgram[];
    find.mockResolvedValueOnce(rows);

    const out = await service.findAll();

    expect(out).toBe(rows);
    expect(repo.find).toHaveBeenCalledWith({
      where: { is_active: true },
      order: { official_code: 'ASC' },
    });
  });

  it('findByCode returns the row matching code + is_active=true', async () => {
    const row = {
      official_code: 'SP09',
      name: 'Scaling for Impact',
      is_active: true,
    } as ClarisaScienceProgram;
    findOne.mockResolvedValueOnce(row);

    const out = await service.findByCode('SP09');

    expect(out).toBe(row);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { official_code: 'SP09', is_active: true },
    });
  });

  it('findByCode returns null when the catalog has no match', async () => {
    findOne.mockResolvedValueOnce(null);

    const out = await service.findByCode('SP99');

    expect(out).toBeNull();
  });
});
