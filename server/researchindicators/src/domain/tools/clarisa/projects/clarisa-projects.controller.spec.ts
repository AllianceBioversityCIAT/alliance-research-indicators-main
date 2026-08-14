import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ROLES_KEY } from '../../../shared/guards/roles.guard';
import { QueryParseBool } from '../../../shared/pipes/query-parse-boolean.pipe';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProject } from './dto/clarisa-project.types';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-04 / R-BAS-003, R-BAS-004, R-BAS-006
// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
// Covers the admin picker endpoint:
//   - role gate metadata (CENTER_ADMIN, SYSTEM_ADMIN)
//   - query params: search, phase (forwarded), only-with-science-programs (via QueryParseBool)
//   - additive response fields: phase, source_center_acronym, has_science_programs
//   - trim of upstream payload (Confirmed + code 22 SPs only)
//   - non-numeric phase error propagation (400)
//   - in-memory search substring filter
describe('ClarisaProjectsController (T-04 / T-15.15)', () => {
  let controller: ClarisaProjectsController;
  const listBilateralProjects = jest.fn();
  const hasSciencePrograms = jest.fn(
    (project: ClarisaProject) =>
      project.project_mappings_array?.some(
        (m) =>
          m.status === 'Confirmed' &&
          m.global_unit_object?.cgiar_entity_type_object?.code === 22,
      ) ?? false,
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaProjectsController],
      providers: [
        {
          provide: ClarisaProjectsService,
          useValue: {
            listBilateralProjects,
            hasSciencePrograms,
          },
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

  it('returns trimmed picker shape with additive fields (phase, source_center_acronym, has_science_programs)', async () => {
    // KZ-001: faithful mock shape representing real listBilateralProjects output
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 1,
        short_name: 'T-PJ-003262-CIAT',
        source_of_funding: 'BILATERAL - RESTRICTED',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: true,
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
    expect(data[0]).toEqual({
      id: 1,
      short_name: 'T-PJ-003262-CIAT',
      source_of_funding: 'BILATERAL - RESTRICTED',
      phase: 2026,
      source_center_acronym: 'CIAT',
      has_science_programs: true,
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

  it('returns empty science_programs array when project has has_science_programs: false', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 2,
        short_name: 'T-PJ-001122-BIOVERSITY',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'BIOVERSITY',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ]);

    const response = await controller.listBilateral();
    const data = (response as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: 2,
      short_name: 'T-PJ-001122-BIOVERSITY',
      source_of_funding: 'Bilateral',
      phase: 2026,
      source_center_acronym: 'BIOVERSITY',
      has_science_programs: false,
      science_programs: [],
    });
  });

  it('forwards phase parameter to the service (R-BAS-003)', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 3,
        short_name: 'T-PJ-2025-CIAT',
        source_of_funding: 'Bilateral',
        phase: 2025,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ]);

    const response = await controller.listBilateral(undefined, 2025, false);
    expect(listBilateralProjects).toHaveBeenCalledWith({
      phase: 2025,
      onlyWithSciencePrograms: false,
    });
    const data = (response as { data: { id: number; phase: number }[] }).data;
    expect(data[0].phase).toBe(2025);
  });

  it('lets non-numeric phase throw BadRequestException (R-BAS-003)', async () => {
    listBilateralProjects.mockRejectedValueOnce(
      new BadRequestException('Invalid phase "abc": must be a numeric value.'),
    );

    await expect(
      controller.listBilateral(undefined, 'abc' as any, false),
    ).rejects.toThrow(BadRequestException);
    expect(listBilateralProjects).toHaveBeenCalledWith({
      phase: 'abc',
      onlyWithSciencePrograms: false,
    });
  });

  it('forwards onlyWithSciencePrograms parameter parsed by QueryParseBool (R-BAS-004)', async () => {
    const pipe = new QueryParseBool();
    const parsedTrue = pipe.transform('true');
    const parsedFalse = pipe.transform('false');
    const parsedUndefined = pipe.transform(undefined);

    expect(parsedTrue).toBe(true);
    expect(parsedFalse).toBe(false);
    expect(parsedUndefined).toBe(false);

    listBilateralProjects.mockResolvedValueOnce([]);
    await controller.listBilateral(undefined, undefined, parsedTrue);
    expect(listBilateralProjects).toHaveBeenCalledWith({
      phase: undefined,
      onlyWithSciencePrograms: true,
    });
  });

  it('search filter does case-insensitive substring match on short_name', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 1,
        short_name: 'T-PJ-IITA-Nigeria',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
      {
        id: 2,
        short_name: 'T-PJ-CIAT-Kenya',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ]);

    const response = await controller.listBilateral('ciat');
    const data = (response as { data: { id: number }[] }).data;
    expect(data.map((p) => p.id)).toEqual([2]);
  });
});
