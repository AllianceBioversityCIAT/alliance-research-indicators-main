import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaScienceProgramsController } from './clarisa-science-programs.controller';
import { ClarisaScienceProgramsService } from './clarisa-science-programs.service';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
//
// Backfills the sibling spec deferred in commit 5d48b27b. Covers the two
// public routes and the 200/404 envelope wiring.

describe('ClarisaScienceProgramsController (T-15.6)', () => {
  let controller: ClarisaScienceProgramsController;
  const findAll = jest.fn();
  const findByCode = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaScienceProgramsController],
      providers: [
        {
          provide: ClarisaScienceProgramsService,
          useValue: { findAll, findByCode },
        },
      ],
    }).compile();

    controller = module.get(ClarisaScienceProgramsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET / returns the full list with 200 envelope', async () => {
    const rows = [{ official_code: 'SP01' }, { official_code: 'SP02' }];
    findAll.mockResolvedValueOnce(rows);

    const response = await controller.findAll();

    expect(response).toMatchObject({
      data: rows,
      description: 'Science programs found',
      status: HttpStatus.OK,
    });
  });

  it('GET /:code returns 200 envelope when the SP exists', async () => {
    const row = { official_code: 'SP09', name: 'Scaling for Impact' };
    findByCode.mockResolvedValueOnce(row);

    const response = await controller.findByCode('SP09');

    expect(response).toMatchObject({
      data: row,
      description: 'Science program found',
      status: HttpStatus.OK,
    });
    expect(findByCode).toHaveBeenCalledWith('SP09');
  });

  it('GET /:code returns 404 envelope when the SP is missing', async () => {
    findByCode.mockResolvedValueOnce(null);

    const response = await controller.findByCode('SP99');

    expect(response).toMatchObject({
      data: null,
      description: 'Science program not found',
      status: HttpStatus.NOT_FOUND,
    });
  });
});
