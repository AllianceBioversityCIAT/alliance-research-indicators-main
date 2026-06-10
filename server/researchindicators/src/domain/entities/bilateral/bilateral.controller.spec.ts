import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';
import {
  BilateralHlosIndicatorsResponse,
  BilateralSpCatalog,
  BilateralTocCatalogIndicator,
  BilateralTocCatalogResult,
  BilateralTocLevelCatalog,
} from './dto/bilateral-hlos-indicators.response.dto';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ROLES_KEY, RolesGuard } from '../../shared/guards/roles.guard';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';
import { ContributionDto } from './dto/upsert-indicator-mapping.dto';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090, R-BIL-091
//
// Handler-level coverage for the bilateral controller — asserts the controller
// is a thin pass-through to BilateralService + role-decorator metadata is
// wired correctly on every mutation endpoint. T-04 adds Swagger-metadata
// assertions for the reshaped GET /hlos-indicators handler (design §5: the
// frozen envelope must render at /swagger).

describe('BilateralController (T-15.6)', () => {
  let controller: BilateralController;

  const bilateral = {
    getAlignment: jest.fn(),
    getScienceProgramsForResult: jest.fn(),
    getHlosIndicatorsForResult: jest.fn(),
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

    // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090
    it('GET /hlos-indicators → delegates to getHlosIndicatorsForResult and wraps the frozen envelope untouched in ResponseUtils.format', async () => {
      const data = {
        result_code: '19792',
        mapping_status: 'mapped',
        clarisa_project: { id: 123, short_name: 'EMBRAPA - …' },
        result_type: 'capacity_sharing',
        allowed_levels: ['OUTPUT'],
        version_locked: false,
        catalogs: [],
      };
      bilateral.getHlosIndicatorsForResult.mockResolvedValueOnce(data);

      const response = await controller.getHlosIndicatorsForResult();

      expect(bilateral.getHlosIndicatorsForResult).toHaveBeenCalledWith(
        19792,
        '19792',
      );
      expect(bilateral.getHlosIndicatorsForResult).toHaveBeenCalledTimes(1);
      expect(response).toMatchObject({
        description: 'Bilateral HLOs and indicators found',
        status: HttpStatus.OK,
      });
      // The service payload rides `data` untouched — the controller never
      // reshapes the frozen FE envelope (design §5).
      expect((response as { data: unknown }).data).toBe(data);
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

    it('read endpoints (GET /, GET /science-programs, GET /hlos-indicators, GET /indicators) do NOT carry @Roles — RolesGuard short-circuits when no metadata', () => {
      for (const handler of [
        'getAlignment',
        'getScienceProgramsForResult',
        'getHlosIndicatorsForResult',
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

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090 (Swagger: design §5)
  //
  // /swagger cannot be clicked from a unit test — instead we assert the
  // Reflect metadata that SwaggerModule reads when it builds the document:
  // the handler must declare an @ApiResponse(200) typed with the annotated
  // response class, and that class must carry @ApiProperty metadata for
  // every frozen top-level field, or the §5 shape would render empty.
  describe('Swagger metadata — GET /hlos-indicators (T-04)', () => {
    const apiResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      BilateralController.prototype.getHlosIndicatorsForResult,
    ) as Record<string, { type?: unknown; description?: string }>;

    it('declares @ApiResponse 200 typed with BilateralHlosIndicatorsResponse, plus the 404/503 error responses (design §5)', () => {
      expect(apiResponses).toBeDefined();
      expect(apiResponses[HttpStatus.OK].type).toBe(
        BilateralHlosIndicatorsResponse,
      );
      expect(apiResponses[HttpStatus.NOT_FOUND]).toBeDefined();
      expect(apiResponses[HttpStatus.SERVICE_UNAVAILABLE]).toBeDefined();
    });

    it('BilateralHlosIndicatorsResponse carries @ApiProperty metadata for every frozen top-level field — and none of the legacy keys', () => {
      const properties = (Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES_ARRAY,
        BilateralHlosIndicatorsResponse.prototype,
      ) ?? []) as string[];

      // DECORATORS.API_MODEL_PROPERTIES_ARRAY entries are ':<field>'.
      const fields = properties.map((p) => p.replace(/^:/, ''));
      expect(fields.sort()).toEqual(
        [
          'result_code',
          'mapping_status',
          'clarisa_project',
          'result_type',
          'allowed_levels',
          'version_locked',
          'catalogs',
        ].sort(),
      );
      // R-BIL-090 AC.2 at the docs level: no legacy keys in the schema.
      expect(fields).not.toContain('pairs');
      expect(fields).not.toContain('aow_status');
      expect(fields).not.toContain('no_aow_mappings');
    });

    it('the nested catalog classes are annotated down to the indicator leaf (so /swagger renders the full §5 tree)', () => {
      for (const [cls, expected] of [
        [BilateralSpCatalog, ['sp_code', 'levels']],
        [BilateralTocLevelCatalog, ['level', 'toc_results']],
        [
          BilateralTocCatalogResult,
          ['toc_result_id', 'title', 'description', 'aow_code', 'indicators'],
        ],
        [
          BilateralTocCatalogIndicator,
          [
            'indicator_id',
            'indicator_description',
            'unit_of_measurement',
            'type_value',
            'target_value',
            'target_year',
          ],
        ],
      ] as const) {
        const properties = (Reflect.getMetadata(
          DECORATORS.API_MODEL_PROPERTIES_ARRAY,
          (cls as { prototype: object }).prototype,
        ) ?? []) as string[];
        expect(properties.map((p) => p.replace(/^:/, '')).sort()).toEqual(
          [...expected].sort(),
        );
      }
    });
  });
});
