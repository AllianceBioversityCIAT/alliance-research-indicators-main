import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ROLES_KEY, RolesGuard } from '../../shared/guards/roles.guard';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';
import { ContributionDto } from './dto/upsert-indicator-mapping.dto';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
//
// Handler-level coverage for the bilateral controller — asserts the controller
// is a thin pass-through to BilateralService + role-decorator metadata is
// wired correctly on every mutation endpoint.

describe('BilateralController (T-15.6)', () => {
  let controller: BilateralController;

  const bilateral = {
    getAlignment: jest.fn(),
    getScienceProgramsForResult: jest.fn(),
    listIndicators: jest.fn(),
    updateAlignment: jest.fn(),
    upsertContribution: jest.fn(),
    deleteContribution: jest.fn(),
  };
  const resultsUtil = {
    resultId: 19792,
    resultCode: '19792',
  } as unknown as ResultsUtil;

  const user: User = { sec_user_id: 42 } as User;
  const req = { user } as never;

  beforeEach(async () => {
    // Override guards so Nest doesn't try to instantiate their full DI graph
    // (RolesGuard / ResultOwnerGuard pull REQUEST-scoped services we don't
    // need for handler-level + metadata coverage).
    const passthrough = { canActivate: () => true };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralController],
      providers: [
        { provide: BilateralService, useValue: bilateral },
        { provide: ResultsUtil, useValue: resultsUtil },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(passthrough)
      .overrideGuard(ResultOwnerGuard)
      .useValue(passthrough)
      .compile();

    controller = module.get(BilateralController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handler delegation + envelope wrapping', () => {
    it('GET / → delegates to BilateralService.getAlignment + wraps 200 envelope', async () => {
      bilateral.getAlignment.mockResolvedValueOnce({ result_code: '19792' });

      const response = await controller.getAlignment(req);

      expect(bilateral.getAlignment).toHaveBeenCalledWith(19792, '19792', user);
      expect(response).toMatchObject({
        description: 'Pool funding alignment found',
        status: HttpStatus.OK,
        data: { result_code: '19792' },
      });
    });

    it('GET /science-programs → delegates to getScienceProgramsForResult', async () => {
      bilateral.getScienceProgramsForResult.mockResolvedValueOnce({
        mapping_status: 'mapped',
      });

      const response = await controller.getScienceProgramsForResult();

      expect(bilateral.getScienceProgramsForResult).toHaveBeenCalledWith(
        19792,
        '19792',
      );
      expect(response).toMatchObject({
        description: 'Bilateral science programs found',
        status: HttpStatus.OK,
      });
    });

    it('GET /indicators → forwards search + indicator-type query params', async () => {
      bilateral.listIndicators.mockResolvedValueOnce([]);

      const response = await controller.listIndicators(req, 'foo', 'output');

      expect(bilateral.listIndicators).toHaveBeenCalledWith(
        19792,
        '19792',
        { search: 'foo', indicator_type: 'output' },
        user,
      );
      expect(response).toMatchObject({
        description: 'Pool funding indicators found',
        status: HttpStatus.OK,
      });
    });

    it('PATCH / → forwards the body to updateAlignment', async () => {
      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01'],
      };
      bilateral.updateAlignment.mockResolvedValueOnce({});

      const response = await controller.updateAlignment(req, dto);

      expect(bilateral.updateAlignment).toHaveBeenCalledWith(
        19792,
        '19792',
        dto,
        user,
      );
      expect(response).toMatchObject({
        description: 'Pool funding alignment updated',
        status: HttpStatus.OK,
      });
    });

    it('POST .../contribution → forwards indicatorCode + leverCode + body', async () => {
      const dto = {
        indicator_type: 'NOOP',
        narrative: 'x',
      } as unknown as ContributionDto;
      bilateral.upsertContribution.mockResolvedValueOnce({});

      const response = await controller.createContribution(
        req,
        'IND-001',
        'SP01',
        dto,
      );

      expect(bilateral.upsertContribution).toHaveBeenCalledWith(
        19792,
        '19792',
        'IND-001',
        dto,
        user,
        'SP01',
      );
      expect(response).toMatchObject({
        description: 'Pool funding indicator contribution saved',
        status: HttpStatus.OK,
      });
    });

    it('PATCH .../contribution → also delegates to upsertContribution', async () => {
      const dto = { indicator_type: 'NOOP' } as unknown as ContributionDto;
      bilateral.upsertContribution.mockResolvedValueOnce({});

      const response = await controller.updateContribution(
        req,
        'IND-001',
        'SP01',
        dto,
      );

      expect(bilateral.upsertContribution).toHaveBeenCalledTimes(1);
      expect(response).toMatchObject({
        description: 'Pool funding indicator contribution updated',
      });
    });

    it('DELETE .../contribution → delegates to deleteContribution and returns null envelope', async () => {
      bilateral.deleteContribution.mockResolvedValueOnce(undefined);

      const response = await controller.deleteContribution(
        req,
        'IND-001',
        'SP01',
      );

      expect(bilateral.deleteContribution).toHaveBeenCalledWith(
        19792,
        '19792',
        'IND-001',
        user,
        'SP01',
      );
      expect(response).toMatchObject({
        description: 'Pool funding indicator contribution deleted',
        status: HttpStatus.OK,
        data: null,
      });
    });
  });

  describe('role-decorator metadata (RolesGuard enforces server-side)', () => {
    const reflector = new Reflector();
    const mutationRoles = [
      SecRolesEnum.CONTRIBUTOR,
      SecRolesEnum.CENTER_ADMIN,
      SecRolesEnum.SYSTEM_ADMIN,
    ];

    it.each([
      ['updateAlignment', 'updateAlignment'],
      ['createContribution', 'createContribution'],
      ['updateContribution', 'updateContribution'],
      ['deleteContribution', 'deleteContribution'],
    ])(
      '%s carries @Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)',
      (_label, handler) => {
        const fn = (
          controller as unknown as Record<
            string,
            (...args: unknown[]) => unknown
          >
        )[handler];
        const roles = reflector.get<SecRolesEnum[]>(ROLES_KEY, fn);
        expect(roles).toEqual(mutationRoles);
      },
    );

    it('read endpoints (GET /, GET /science-programs, GET /indicators) do NOT carry @Roles — RolesGuard short-circuits when no metadata', () => {
      for (const handler of [
        'getAlignment',
        'getScienceProgramsForResult',
        'listIndicators',
      ]) {
        const fn = (
          controller as unknown as Record<
            string,
            (...args: unknown[]) => unknown
          >
        )[handler];
        const roles = reflector.get<SecRolesEnum[]>(ROLES_KEY, fn);
        expect(roles).toBeUndefined();
      }
    });
  });
});
