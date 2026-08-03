import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ROLES_KEY } from '../../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
// Covers the admin picker endpoint that powers the new SSR page:
//   - role gate metadata
//   - trim of the upstream payload (Confirmed + entity_type 22 only)
//   - in-memory `search` substring filter
describe('ClarisaProjectsController (T-15.15)', () => {
  let controller: ClarisaProjectsController;
  const listBilateralProjects = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaProjectsController],
      providers: [
        {
          provide: ClarisaProjectsService,
          useValue: { listBilateralProjects },
        },
      ],
    }).compile();

    controller = module.get(ClarisaProjectsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('listBilateral is gated by CENTER_ADMIN + SYSTEM_ADMIN roles', () => {
    const reflector = new Reflector();
    const roles = reflector.get<SecRolesEnum[]>(
      ROLES_KEY,
      controller.listBilateral,
    );
    expect(roles).toEqual([
      SecRolesEnum.CENTER_ADMIN,
      SecRolesEnum.SYSTEM_ADMIN,
    ]);
  });

  it('returns trimmed picker shape (Confirmed + entity_type 22 only)', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 1,
        short_name: 'T-PJ-003262-IITA',
        source_of_funding: 'Bilateral',
        project_mappings_array: [
          {
            allocation: 25,
            status: 'Confirmed',
            global_unit_object: {
              smo_code: 'SP09',
              name: 'Scaling for Impact',
              cgiar_entity_type_object: { code: 22, name: 'Science programs' },
              portfolio_object: { acronym: 'P25' },
            },
          },
          {
            allocation: 50,
            status: 'Pending',
            global_unit_object: {
              smo_code: 'SP10',
              name: 'Gender',
              cgiar_entity_type_object: { code: 22, name: 'Science programs' },
              portfolio_object: { acronym: 'P25' },
            },
          },
          {
            allocation: 30,
            status: 'Confirmed',
            global_unit_object: {
              smo_code: 'L01',
              name: 'Lever 01',
              cgiar_entity_type_object: { code: 6, name: 'Lever' },
              portfolio_object: { acronym: 'P25' },
            },
          },
        ],
      },
    ]);

    const response = await controller.listBilateral();
    const data = (response as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 1,
      short_name: 'T-PJ-003262-IITA',
      source_of_funding: 'Bilateral',
      science_programs: [
        {
          code: 'SP09',
          name: 'Scaling for Impact',
          portfolio: 'P25',
          allocation: 25,
        },
      ],
    });
  });

  it('search filter does case-insensitive substring match on short_name', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 1,
        short_name: 'T-PJ-IITA-Nigeria',
        source_of_funding: 'Bilateral',
        project_mappings_array: [],
      },
      {
        id: 2,
        short_name: 'T-PJ-CIAT-Kenya',
        source_of_funding: 'Bilateral',
        project_mappings_array: [],
      },
    ]);

    const response = await controller.listBilateral('iita');
    const data = (response as { data: { id: number }[] }).data;
    expect(data.map((p) => p.id)).toEqual([1]);
  });
});
