import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / T-15.6
// Verifies handler wiring + role gating (R-BIL-080).

describe('BilateralProjectMappingController', () => {
  let controller: BilateralProjectMappingController;
  let service: jest.Mocked<BilateralProjectMappingService>;

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
      ],
    }).compile();

    controller = module.get(BilateralProjectMappingController);
    service = module.get(BilateralProjectMappingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('role gating (R-BIL-080)', () => {
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
