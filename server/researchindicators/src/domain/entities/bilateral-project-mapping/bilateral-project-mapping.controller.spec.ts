import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';
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
        'limit-samples': 15,
      });

      expect(coverageService.getCoverageReport).toHaveBeenCalledWith(15);
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

      expect(coverageService.getCoverageReport).toHaveBeenCalledWith(undefined);
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
    it('accepts limit-samples and does not declare phase', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        'limit-samples': 10,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto['limit-samples']).toBe(10);
      expect(dto).not.toHaveProperty('phase');
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

    it('ignores a phase query property (R-APM-003)', async () => {
      const dto = plainToInstance(CoverageReportQueryDto, {
        phase: 'not-a-number',
        'limit-samples': 10,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phase')).toBe(false);
      expect(errors).toHaveLength(0);
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

    it('returns 201 when the upsert outcome is created', async () => {
      service.create.mockResolvedValue({
        id: 7,
        outcome: 'created',
      } as never);

      const out = await controller.create(reqUser as never, {
        agresso_agreement_id: 'D527',
        clarisa_project_id: 1,
      });

      expect(out.status).toBe(HttpStatus.CREATED);
      expect(out.data).toEqual(
        expect.objectContaining({ id: 7, outcome: 'created' }),
      );
    });

    it('returns 200 when the upsert outcome is updated', async () => {
      service.create.mockResolvedValue({
        id: 11,
        outcome: 'updated',
        is_active: false,
      } as never);

      const out = await controller.create(reqUser as never, {
        agresso_agreement_id: 'A1697',
        clarisa_project_id: 2,
      });

      expect(out.status).toBe(HttpStatus.OK);
      expect(out.data).toEqual(
        expect.objectContaining({
          id: 11,
          outcome: 'updated',
          is_active: false,
        }),
      );
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
    it('passes justification through', async () => {
      service.deactivate.mockResolvedValue({
        id: 5,
        is_active: false,
      } as never);

      const out = await controller.deactivate(reqUser as never, 5, {
        justification: 'wrong project',
      });

      expect(service.deactivate).toHaveBeenCalledWith(
        5,
        fakeUser,
        'wrong project',
        undefined,
      );
      expect(out.status).toBe(HttpStatus.OK);
    });

    it('passes a justification body and optional notes', async () => {
      service.deactivate.mockResolvedValue({
        id: 5,
        is_active: false,
      } as never);
      const out = await controller.deactivate(reqUser as never, 5, {
        justification: 'Contract closed',
        notes: 'fresh note',
      });
      expect(service.deactivate).toHaveBeenCalledWith(
        5,
        fakeUser,
        'Contract closed',
        'fresh note',
      );
      expect(out.status).toBe(HttpStatus.OK);
    });
  });
});

// Real RolesGuard + Reflector, same shape as
// impersonation.controller.spec.ts. A guard mock that always returns true
// would stay green if @Roles were removed (T-06 disqualifier).
describe('PATCH :id/activate (R-APM-011)', () => {
  let app: INestApplication;
  let activate: jest.Mock;
  let deactivate: jest.Mock;

  beforeAll(async () => {
    activate = jest.fn().mockResolvedValue({ id: 5, is_active: true });
    deactivate = jest.fn().mockResolvedValue({ id: 5, is_active: false });

    const moduleRef = await Test.createTestingModule({
      controllers: [BilateralProjectMappingController],
      providers: [
        {
          provide: BilateralProjectMappingService,
          useValue: {
            activate,
            deactivate,
            list: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: BilateralMappingCoverageService,
          useValue: { getCoverageReport: jest.fn() },
        },
        Reflector,
        RolesGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 42,
        roles: rolesHeader ? JSON.parse(rolesHeader as string) : [],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  it('PATCH :id/activate returns 200 for CENTER_ADMIN and passes notes', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ notes: 'restored' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(activate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'restored',
      undefined,
      undefined,
    );
  });

  it('denied role → 403 for activate', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .send({});

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(activate).not.toHaveBeenCalled();
  });

  it('PATCH :id/deactivate passes a justification through the validation pipe', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ justification: 'wrong project' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(deactivate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'wrong project',
      undefined,
    );
  });

  const centerAdmin = () => JSON.stringify([SecRolesEnum.CENTER_ADMIN]);

  it('AC.1 rejects {} and the error payload names justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({});

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(deactivate).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).toMatch(/justification/);
  });

  it('AC.1 rejects whitespace-only justification and the error payload names justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: '   ' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(deactivate).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).toMatch(/justification/);
    expect(JSON.stringify(res.body)).not.toMatch(/should not exist/);
  });

  it('AC.3 rejects a 501-character justification and the error payload names justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: 'a'.repeat(501) });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(deactivate).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).toMatch(
      /justification must be shorter than or equal to 500 characters/,
    );
  });

  it('AC.2 stores a padded justification trimmed', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: ' Contract closed ' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(deactivate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'Contract closed',
      undefined,
    );
  });

  it('P-11 stores " x " as "x"', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: ' x ' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(deactivate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'x',
      undefined,
    );
  });

  it('AC.4 accepts the admin-panel justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: 'Deactivated via admin panel' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(deactivate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'Deactivated via admin panel',
      undefined,
    );
  });

  it('rejects a body that sends notes without justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ notes: 'x' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(deactivate).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).toMatch(/justification/);
  });

  it('trims optional notes and passes them with the justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/deactivate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: 'Contract closed', notes: '  side note  ' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(deactivate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      'Contract closed',
      'side note',
    );
  });

  it('PATCH :id/activate passes clarisa_project_id', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', centerAdmin())
      .send({ clarisa_project_id: 77 });

    expect(res.status).toBe(HttpStatus.OK);
    expect(activate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      undefined,
      77,
      undefined,
    );
  });

  it('AC.5 activate with an empty body returns 200', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', centerAdmin())
      .send({});

    expect(res.status).toBe(HttpStatus.OK);
    expect(activate).toHaveBeenCalled();
  });

  it('R-MSE-008 trims an optional justification and passes it to activate', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: ' Contract renewed ' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(activate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      undefined,
      undefined,
      'Contract renewed',
    );
  });

  it('R-MSE-008 accepts a blank justification without rejecting it', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: '   ' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(activate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ sec_user_id: 42 }),
      undefined,
      undefined,
      '',
    );
  });

  it('R-MSE-008 rejects a 501-character justification and the error payload names justification', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', centerAdmin())
      .send({ justification: 'a'.repeat(501) });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(activate).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).toMatch(
      /justification must be shorter than or equal to 500 characters/,
    );
  });

  it('PATCH :id/activate rejects a non-whitelisted body field', async () => {
    const res = await request(app.getHttpServer())
      .patch('/5/activate')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ notes: 'ok', extra: true });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(activate).not.toHaveBeenCalled();
  });
});
