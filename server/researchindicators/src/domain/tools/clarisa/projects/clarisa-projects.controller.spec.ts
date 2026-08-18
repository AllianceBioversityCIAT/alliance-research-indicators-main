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
// @sdd-spec docs/specs/bugfix/bilateral-picker-fields — T-01 / R-BPF-001, R-BPF-002, R-BPF-006, NFR-BPF-001, NFR-BPF-003
// Covers the admin picker endpoint:
//   - role gate metadata (CENTER_ADMIN, SYSTEM_ADMIN)
//   - query params: search, phase (forwarded), only-with-science-programs (via QueryParseBool)
//   - additive response fields: full_name, description, phase, source_center_acronym, has_science_programs
//   - trim of upstream payload (Confirmed + code 22 SPs only)
//   - non-numeric phase error propagation (400)
//   - in-memory search substring filter (short_name OR full_name, not description)
//   - deterministic case-insensitive sorting by full_name (falling back to short_name)
describe('ClarisaProjectsController (T-04 / T-15.15 / T-01)', () => {
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

  it('returns trimmed picker shape with additive fields including full_name, description, and external_code (R-BPF-001, NFR-BPF-001)', async () => {
    // KZ-001: faithful mock shape representing real listBilateralProjects output
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 1,
        short_name: 'A1806',
        full_name: 'WTO-Phase 1: MusaSentinel',
        description: 'MusaSentinel surveillance and diagnostics project',
        external_code: 'B-A1080',
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
      short_name: 'A1806',
      full_name: 'WTO-Phase 1: MusaSentinel',
      description: 'MusaSentinel surveillance and diagnostics project',
      external_code: 'B-A1080',
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

  it('handles absent full_name, description, and external_code without throwing (R-BPF-001)', async () => {
    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 2,
        short_name: 'B-A1080',
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
      short_name: 'B-A1080',
      full_name: undefined,
      description: undefined,
      external_code: undefined,
      source_of_funding: 'Bilateral',
      phase: 2026,
      source_center_acronym: 'BIOVERSITY',
      has_science_programs: false,
      science_programs: [],
    });
  });

  it('supports full_name of exactly 255 characters (KZ-001 / R-BPF-005)', async () => {
    const fullName255 = 'WTO-Phase 1: MusaSentinel - ' + 'X'.repeat(255 - 28);
    expect(fullName255.length).toBe(255);

    listBilateralProjects.mockResolvedValueOnce([
      {
        id: 3,
        short_name: 'C-A480',
        full_name: fullName255,
        description: null,
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ]);

    const response = await controller.listBilateral();
    const data = (response as { data: { full_name?: string }[] }).data;
    expect(data[0].full_name).toBe(fullName255);
    expect(data[0].full_name?.length).toBe(255);
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

  describe('search filtering (R-BPF-002)', () => {
    const fixtureProjects = [
      {
        id: 1,
        short_name: 'A1806',
        full_name: 'WTO-Phase 1: MusaSentinel',
        description: 'Surveillance diagnostics',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
      {
        id: 2,
        short_name: 'B-A1080',
        full_name: undefined,
        description: 'No full name present',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'BIOVERSITY',
        has_science_programs: false,
        project_mappings_array: [],
      },
      {
        id: 3,
        short_name: 'C-A480',
        full_name: 'Fertilize Right Colombia',
        description: 'Special keyword secret_target',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ];

    it('matches by full_name case-insensitively when short_name does not contain needle (R-BPF-002 mandatory red gate input)', async () => {
      listBilateralProjects.mockResolvedValueOnce(fixtureProjects);

      const response = await controller.listBilateral('musasentinel');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([1]);
    });

    it('matches uppercase full_name term case-insensitively', async () => {
      listBilateralProjects.mockResolvedValueOnce(fixtureProjects);

      const response = await controller.listBilateral('MUSASENTINEL');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([1]);
    });

    it('still matches by short_name code term', async () => {
      listBilateralProjects.mockResolvedValueOnce(fixtureProjects);

      const response = await controller.listBilateral('A1806');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([1]);
    });

    it('does NOT match on description (DD-2 / OQ-1)', async () => {
      listBilateralProjects.mockResolvedValueOnce(fixtureProjects);

      const response = await controller.listBilateral('secret_target');
      const data = (response as { data: { id: number }[] }).data;
      expect(data).toEqual([]);
    });

    it('tolerates absent full_name without throwing and matches short_name', async () => {
      listBilateralProjects.mockResolvedValueOnce(fixtureProjects);

      const response = await controller.listBilateral('B-A1080');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([2]);
    });

    it('matches by external_code case-insensitively when short_name does not contain needle (R-BPF-002 mandatory red gate input / DD-9)', async () => {
      listBilateralProjects.mockResolvedValueOnce([
        {
          id: 1,
          short_name: 'Fertilize Right Colombia',
          full_name: 'Fertilize Right Colombia',
          external_code: 'B-A1080',
          source_of_funding: 'Bilateral',
          phase: 2026,
          source_center_acronym: 'CIAT',
          has_science_programs: false,
          project_mappings_array: [],
        },
      ]);

      const response = await controller.listBilateral('b-a1080');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([1]);
    });

    it('matches uppercase external_code term case-insensitively', async () => {
      listBilateralProjects.mockResolvedValueOnce([
        {
          id: 1,
          short_name: 'Fertilize Right Colombia',
          full_name: 'Fertilize Right Colombia',
          external_code: 'B-A1080',
          source_of_funding: 'Bilateral',
          phase: 2026,
          source_center_acronym: 'CIAT',
          has_science_programs: false,
          project_mappings_array: [],
        },
      ]);

      const response = await controller.listBilateral('B-A1080');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([1]);
    });

    it('tolerates absent or null external_code without throwing and matches short_name or full_name (R-BPF-002)', async () => {
      listBilateralProjects.mockResolvedValueOnce([
        {
          id: 1,
          short_name: 'Semillas del Futuro - AGROSAVIA',
          full_name: 'Semillas del Futuro - AGROSAVIA',
          external_code: null,
          source_of_funding: 'Bilateral',
          phase: 2026,
          source_center_acronym: 'CIAT',
          has_science_programs: false,
          project_mappings_array: [],
        },
        {
          id: 2,
          short_name: 'Fertilize Right Colombia',
          full_name: 'Fertilize Right Colombia',
          external_code: 'B-A1080',
          source_of_funding: 'Bilateral',
          phase: 2026,
          source_center_acronym: 'CIAT',
          has_science_programs: false,
          project_mappings_array: [],
        },
      ]);

      const response = await controller.listBilateral('b-a1080');
      const data = (response as { data: { id: number }[] }).data;
      expect(data.map((p) => p.id)).toEqual([2]);
    });
  });

  describe('sorting (R-BPF-006 / DD-3)', () => {
    const mixedProjects = [
      {
        id: 1,
        short_name: 'A1806',
        full_name: 'WTO-Phase 1: MusaSentinel',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
      {
        id: 2,
        short_name: 'B-A1080',
        full_name: undefined,
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'BIOVERSITY',
        has_science_programs: false,
        project_mappings_array: [],
      },
      {
        id: 3,
        short_name: 'C-A480',
        full_name: 'Fertilize Right Colombia',
        source_of_funding: 'Bilateral',
        phase: 2026,
        source_center_acronym: 'CIAT',
        has_science_programs: false,
        project_mappings_array: [],
      },
    ];

    it('orders case-insensitively by full_name with absent full_name falling back to short_name in sequence', async () => {
      listBilateralProjects.mockResolvedValueOnce(mixedProjects);

      const response = await controller.listBilateral();
      const data = (response as { data: { id: number }[] }).data;
      // Expected sort keys:
      // id 2 (B-A1080 fallback): 'b-a1080'
      // id 3 (Fertilize Right Colombia): 'fertilize right colombia'
      // id 1 (WTO-Phase 1: MusaSentinel): 'wto-phase 1: musasentinel'
      expect(data.map((p) => p.id)).toEqual([2, 3, 1]);
    });

    it('produces stable and deterministic order across two identical invocations', async () => {
      listBilateralProjects.mockResolvedValueOnce(mixedProjects);
      const res1 = await controller.listBilateral();

      listBilateralProjects.mockResolvedValueOnce(mixedProjects);
      const res2 = await controller.listBilateral();

      const data1 = (res1 as { data: { id: number }[] }).data;
      const data2 = (res2 as { data: { id: number }[] }).data;
      expect(data1.map((p) => p.id)).toEqual(data2.map((p) => p.id));
      expect(data1).toHaveLength(3);
    });
  });
});
