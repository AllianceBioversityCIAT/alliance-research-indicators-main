import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { CoverageReportQueryDto } from './dto/coverage-report.query.dto';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / T-15.6
// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 / R-CPA-006 / DD-12
// Verifies handler wiring, DTO validation, and role gating metadata.

describe('BilateralProjectMappingController', () => {
  let controller: BilateralProjectMappingController;
  let service: jest.Mocked<BilateralProjectMappingService>;
  let coverageService: jest.Mocked<BilateralMappingCoverageService>;

  const fakeUser = { sec_user_id: 42 } as User;
  const reqUser = { user: fakeUser } as { user: User };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralProjectMappingController],
      providers: [
        {
          provide: BilateralProjectMappingService,
          useValue: {
            list: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
          },
        },
        {
          provide: BilateralMappingCoverageService,
          useValue: {
            getCoverageReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(BilateralProjectMappingController);
    service = module.get(BilateralProjectMappingService);
    coverageService = module.get(BilateralMappingCoverageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('role gating (R-BIL-080 / R-CPA-006)', () => {
    it('declares @Roles(CENTER_ADMIN, SYSTEM_ADMIN) at controller level', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        BilateralProjectMappingController,
      );
      expect(roles).toEqual([
        SecRolesEnum.CENTER_ADMIN,
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
    });

    it('declares @UseGuards(RolesGuard) at controller level', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        BilateralProjectMappingController,
      );
      expect(guards).toBeDefined();
      // Guard class references compare by identity; assert RolesGuard is present.
      expect(
        (guards as ReadonlyArray<new (...args: unknown[]) => unknown>).some(
          (g) => g === RolesGuard,
        ),
      ).toBe(true);
    });
  });

  describe('list', () => {
    it('delegates to service.list and wraps the envelope', async () => {
      service.list.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
      });

      const out = await controller.list({});

      expect(service.list).toHaveBeenCalledWith({});
      expect(out.status).toBe(HttpStatus.OK);
      expect(out.description).toMatch(/found/i);
    });
  });

  describe('getCoverageReport (T-05 / R-CPA-006)', () => {
    it('delegates to coverageService.getCoverageReport and wraps response in ServerResponseDto envelope', async () => {
      const mockReport = {
        environment: {
          clarisa_host: 'https://clarisatest-back.ciat.cgiar.org/',
          upstream_contract_available: true,
        },
        measured_at: '2026-08-14T00:00:00.000Z',
        phase_used: 2026,
      } as any;

      coverageService.getCoverageReport.mockResolvedValue(mockReport);

      const out = await controller.getCoverageReport({
        phase: 2026,
        'limit-samples': 15,
      });

      expect(coverageService.getCoverageReport).toHaveBeenCalledWith(2026, 15);
      expect(out.status).toBe(HttpStatus.OK);
      expect(out.description).toMatch(/coverage report generated/i);
      expect(out.data).toBe(mockReport);
    });

    it('handles empty query parameters without errors', async () => {
      const mockReport = {
        environment: {
          clarisa_host: 'https://clarisatest-back.ciat.cgiar.org/',
          upstream_contract_available: true,
        },
      } as any;
      coverageService.getCoverageReport.mockResolvedValue(mockReport);

      await controller.getCoverageReport({});

      expect(coverageService.getCoverageReport).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('sets description indicating upstream contract is not published when upstream_contract_available is false (R-CPA-005)', async () => {
      const mockReportUnavailable = {
        environment: {
          clarisa_host: 'https://api.clarisa.cgiar.org/',
          upstream_contract_available: false,
        },
        measured_at: '2026-08-14T00:00:00.000Z',
        phase_used: 2026,
      } as any;

      coverageService.getCoverageReport.mockResolvedValue(
        mockReportUnavailable,
      );

      const out = await controller.getCoverageReport({});

      expect(out.status).toBe(HttpStatus.OK);
      expect(out.description).toMatch(
        /upstream contract is not published in the measured environment/i,
      );
      expect(out.description).toContain('https://api.clarisa.cgiar.org/');
      expect(out.data).toBe(mockReportUnavailable);
    });
  });

  describe('CoverageReportQueryDto validation', () => {
    it('accepts valid query with phase and limit-samples', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        phase: 2026,
        'limit-samples': 10,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.phase).toBe(2026);
      expect(dto['limit-samples']).toBe(10);
    });

    it('rejects limit-samples < 1 (e.g. 0)', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        'limit-samples': 0,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit-samples')).toBe(true);
    });

    it('rejects limit-samples > 50 (e.g. 51)', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        'limit-samples': 51,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit-samples')).toBe(true);
    });

    it('rejects non-integer phase', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        phase: 'not-a-number',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phase')).toBe(true);
    });
  });

  describe('findById', () => {
    it('delegates and wraps', async () => {
      service.findById.mockResolvedValue({ id: 5 } as never);
      const out = await controller.findById(5);
      expect(service.findById).toHaveBeenCalledWith(5);
      expect(out.status).toBe(HttpStatus.OK);
    });
  });

  describe('create', () => {
    it('returns 201 and passes request.user', async () => {
      service.create.mockResolvedValue({ id: 7 } as never);

      const out = await controller.create(reqUser as never, {
        agresso_agreement_id: 'D527',
        clarisa_project_id: 1,
      });

      expect(service.create).toHaveBeenCalledWith(
        { agresso_agreement_id: 'D527', clarisa_project_id: 1 },
        fakeUser,
      );
      expect(out.status).toBe(HttpStatus.CREATED);
    });
  });

  describe('update', () => {
    it('delegates with id, body, user', async () => {
      service.update.mockResolvedValue({ id: 5 } as never);
      const out = await controller.update(reqUser as never, 5, { notes: 'x' });
      expect(service.update).toHaveBeenCalledWith(5, { notes: 'x' }, fakeUser);
      expect(out.status).toBe(HttpStatus.OK);
    });
  });

  describe('deactivate', () => {
    it('passes optional notes through', async () => {
      service.deactivate.mockResolvedValue({
        id: 5,
        is_active: false,
      } as never);

      const out = await controller.deactivate(reqUser as never, 5, {
        notes: 'wrong project',
      });

      expect(service.deactivate).toHaveBeenCalledWith(
        5,
        fakeUser,
        'wrong project',
      );
      expect(out.status).toBe(HttpStatus.OK);
    });

    it('works without a body', async () => {
      service.deactivate.mockResolvedValue({
        id: 5,
        is_active: false,
      } as never);
      const out = await controller.deactivate(reqUser as never, 5);
      expect(service.deactivate).toHaveBeenCalledWith(5, fakeUser, undefined);
      expect(out.status).toBe(HttpStatus.OK);
    });
  });
});
