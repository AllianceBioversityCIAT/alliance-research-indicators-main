import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ExecutionContext,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA, PIPES_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { ResultInnovationUseController } from './result-innovation-use.controller';
import { ResultInnovationUseService } from './result-innovation-use.service';
import {
  RESULT_CODE_PARAM,
  REPORTING_PLATFORMS,
  REPORT_YEAR_PARAM,
  ResultsUtil,
} from '../../shared/utils/results.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { CreateResultInnovationUseDto } from './dto/create-result-innovation-use.dto';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';

jest.mock('../../shared/utils/response.utils');

describe('ResultInnovationUseController', () => {
  let controller: ResultInnovationUseController;
  const mockService = {
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationUseController],
      providers: [
        { provide: ResultInnovationUseService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 11,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultInnovationUseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findOne returns the envelope from the service read', async () => {
    const res = { innovation_use_level_id: null };
    mockService.findOne.mockResolvedValue(res);
    mockFormat.mockReturnValue({});
    await controller.findOne();
    expect(mockService.findOne).toHaveBeenCalledWith(11);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result Innovation Use retrieved successfully',
      data: res,
      status: HttpStatus.OK,
    });
  });

  it('update (patch) returns the envelope from the service write', async () => {
    const dto = {} as CreateResultInnovationUseDto;
    const res = { innovation_use_level_id: 3 };
    mockService.update.mockResolvedValue(res);
    mockFormat.mockReturnValue({});
    await controller.update(dto);
    expect(mockService.update).toHaveBeenCalledWith(11, dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result Innovation Use updated successfully',
      data: res,
      status: HttpStatus.OK,
    });
  });

  /**
   * R-IUA-013 AC.4 — both handlers carry `@GetResultVersion()`. The
   * decorator is Swagger-only (it applies `ApiParam`/`ApiQuery`, never a
   * functional pipe or guard — `versioning.decorator.ts`), so there is no
   * request-shape behavior to exercise. Presence is checked the same way
   * `@nestjs/swagger` itself resolves it: the `API_PARAMETERS` metadata key
   * on the handler's `descriptor.value`.
   *
   * **Corrected 2026-08-19 (T-07 attempt 2, Lens B Issue 1).** A bare
   * `params.length > 0` check is a tautology on `update`:
   * `@ApiBody({ type: CreateResultInnovationUseDto })` (controller line 60)
   * writes into this *same* `DECORATORS.API_PARAMETERS` array
   * (`@nestjs/swagger/dist/decorators/api-body.decorator.js` →
   * `helpers.js`'s `createParamDecorator`), so deleting
   * `@GetResultVersion()` from `update` alone leaves one entry from
   * `@ApiBody` and the length check still passes. The assertion below
   * instead names the three specific entries `@GetResultVersion()`
   * contributes — the `in: 'path'` result-code param plus the two
   * `in: 'query'` params (`versioning.decorator.ts:13-40`) — on **both**
   * handlers, so removing the decorator from either one is falsifiable.
   */
  describe('@GetResultVersion() on both handlers (R-IUA-013 AC.4)', () => {
    const expectVersioningParams = (params: unknown[]) => {
      expect(params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: RESULT_CODE_PARAM, in: 'path' }),
          expect.objectContaining({ name: REPORTING_PLATFORMS, in: 'query' }),
          expect.objectContaining({ name: REPORT_YEAR_PARAM, in: 'query' }),
        ]),
      );
    };

    it('is present on findOne (GET)', () => {
      const params = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        ResultInnovationUseController.prototype.findOne,
      );
      expectVersioningParams(params);
    });

    it('is present on update (PATCH), distinct from the @ApiBody entry sharing the same metadata array', () => {
      const params = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        ResultInnovationUseController.prototype.update,
      );
      expectVersioningParams(params);
      expect(params).toEqual(
        expect.arrayContaining([expect.objectContaining({ in: 'body' })]),
      );
    });
  });

  /**
   * DD-8 / `design.md` §4 — PATCH carries
   * `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))`,
   * and `forbidNonWhitelisted` is deliberately absent. This is the
   * **handler-decorator** half of the pipe proof: the behavioral pipe spec
   * below constructs its own pipe and would stay green even if
   * `@UsePipes` were deleted from the handler entirely — only this
   * `PIPES_METADATA` assertion is falsified by that mutation.
   */
  describe('@UsePipes(ValidationPipe) on update (DD-8)', () => {
    it('is present on update with whitelist/transform true and forbidNonWhitelisted unset', () => {
      const pipes = Reflect.getMetadata(
        PIPES_METADATA,
        ResultInnovationUseController.prototype.update,
      );
      expect(Array.isArray(pipes)).toBe(true);
      const validationPipe = pipes.find(
        (p: unknown) => p instanceof ValidationPipe,
      ) as
        | (ValidationPipe & {
            validatorOptions?: {
              whitelist?: boolean;
              forbidNonWhitelisted?: boolean;
            };
            isTransformEnabled?: boolean;
          })
        | undefined;
      expect(validationPipe).toBeDefined();
      expect(validationPipe.validatorOptions?.whitelist).toBe(true);
      expect(validationPipe.isTransformEnabled).toBe(true);
      expect(validationPipe.validatorOptions?.forbidNonWhitelisted).not.toBe(
        true,
      );
    });

    it('findOne carries no pipe', () => {
      const pipes = Reflect.getMetadata(
        PIPES_METADATA,
        ResultInnovationUseController.prototype.findOne,
      );
      expect(pipes ?? []).toHaveLength(0);
    });
  });

  /**
   * R-IUA-003 AC.5 — PATCH carries `@UseGuards(ResultStatusGuard)`.
   *
   * Two independent proofs, deliberately kept separate (KZ-001):
   *  1. Metadata presence — `GUARDS_METADATA` on `update`'s descriptor
   *     names `ResultStatusGuard`. Falsified by deleting `@UseGuards(...)`.
   *  2. Behavior — the *real* `ResultStatusGuard` (not overridden), wired
   *     through Nest DI exactly as the controller declares it, allows one
   *     editable status and rejects one non-editable status with the
   *     guard's actual `BadRequestException` (`400`, not `403` —
   *     `design.md` §4).
   */
  describe('ResultStatusGuard on PATCH (R-IUA-003 AC.5)', () => {
    it('metadata on update names ResultStatusGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ResultInnovationUseController.prototype.update,
      );
      expect(guards).toContain(ResultStatusGuard);
    });

    it('metadata on findOne carries no guard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ResultInnovationUseController.prototype.findOne,
      );
      expect(guards ?? []).not.toContain(ResultStatusGuard);
    });

    const buildRealGuardModule = async (resultStatusId: number) => {
      const findOne = jest
        .fn()
        .mockResolvedValue({ result_status_id: resultStatusId });
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({ findOne }),
      };
      const resultsUtilValue = {
        resultId: 11,
        setup: jest.fn().mockResolvedValue(undefined),
      };
      const currentUserUtilValue = { user: { roles: [] } };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [ResultInnovationUseController],
        providers: [
          { provide: ResultInnovationUseService, useValue: mockService },
          SetUpInterceptor,
          { provide: ResultsUtil, useValue: resultsUtilValue },
          { provide: DataSource, useValue: dataSource },
          { provide: CurrentUserUtil, useValue: currentUserUtilValue },
          ResultStatusGuard,
          mockPortfolioUtilProvider,
        ],
      }).compile();

      return {
        controller: module.get(ResultInnovationUseController),
        guard: module.get(ResultStatusGuard),
      };
    };

    it('allows a save when the result status is editable (DRAFT)', async () => {
      const { controller: realController, guard } = await buildRealGuardModule(
        ResultStatusEnum.DRAFT,
      );

      await expect(guard.canActivate({} as ExecutionContext)).resolves.toBe(
        true,
      );

      const dto = {} as CreateResultInnovationUseDto;
      mockService.update.mockResolvedValue({});
      mockFormat.mockReturnValue({});
      await expect(realController.update(dto)).resolves.toBeDefined();
    });

    it('denies a save when the result status is not editable, with 400 (not 403)', async () => {
      const { guard } = await buildRealGuardModule(ResultStatusEnum.SUBMITTED);

      await expect(guard.canActivate({} as ExecutionContext)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await guard.canActivate({} as ExecutionContext);
        fail('expected canActivate to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('repo conventions (R-IUA-013)', () => {
    const controllerSource = fs.readFileSync(
      path.join(__dirname, 'result-innovation-use.controller.ts'),
      'utf-8',
    );

    it('carries no @Roles(...) (DD-5)', () => {
      expect(controllerSource).not.toMatch(/^\s*@Roles\(/m);
    });

    it('introduces no console.* calls', () => {
      expect(controllerSource).not.toMatch(/console\./);
    });
  });

  /**
   * R-IUA-004 AC.1–AC.8, behaviorally, plus T-07's own ninth case (AC.5's
   * `total` ignore-not-reject rule). Constructs its own
   * `ValidationPipe({ whitelist: true, transform: true })` — the exact
   * options `@UsePipes` applies on `update` — so this suite is independent
   * of whether the controller decorator is present. It is the *rules*
   * proof; the metadata/behavior tests above are the *handler-runs-them*
   * proof (KZ-001). Cases enumerated from `requirements.md` R-IUA-004's AC
   * text and its two scenarios (KZ-002), not only from the T-02 summary
   * table.
   */
  describe('ValidationPipe behavior on CreateResultInnovationUseDto (R-IUA-004)', () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const transform = (payload: unknown) =>
      pipe.transform(payload, {
        type: 'body',
        metatype: CreateResultInnovationUseDto,
      } as any);

    const baseActor = () => ({
      actor_type_id: 1,
      sex_age_disaggregation_not_apply: false,
      women_youth_count: 1,
      women_not_youth_count: 1,
      men_youth_count: 1,
      men_not_youth_count: 1,
    });

    const expectRejected = async (payload: unknown, fieldFragment: string) => {
      await expect(transform(payload)).rejects.toThrow(BadRequestException);
      try {
        await transform(payload);
        fail('expected transform to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const messages: string[] = err.getResponse().message;
        expect(messages.some((m) => m.includes(fieldFragment))).toBe(true);
      }
    };

    /**
     * Same shape as `expectRejected`, but names **every** fragment that
     * must appear across the messages array rather than just one — used
     * where more than one substring must independently be provable (Lens B
     * Issue 2b): the offending field path, **and** the mode flag the
     * conflict is against, so a message naming only the field (e.g. a
     * `@Min(0)` message) does not satisfy the assertion.
     */
    const expectRejectedNaming = async (
      payload: unknown,
      fragments: string[],
    ) => {
      await expect(transform(payload)).rejects.toThrow(BadRequestException);
      try {
        await transform(payload);
        fail('expected transform to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const messages: string[] = err.getResponse().message;
        for (const fragment of fragments) {
          expect(messages.some((m) => m.includes(fragment))).toBe(true);
        }
      }
    };

    // The four disaggregated count fields (R-IUA-004 AC.3, KZ-002: the real
    // thing, not one field as a convenient proxy). Hoisted out of Case 1 so
    // Case 2 below can also enumerate over it.
    const disaggregatedFields = [
      'women_youth_count',
      'women_not_youth_count',
      'men_youth_count',
      'men_not_youth_count',
    ];

    // Case 1 — negative/fractional rejected across the five actor counts +
    // organization_count + quantification_number (AC.1, AC.2).
    describe('Case 1 — negative and fractional counts are rejected, and errors name the field', () => {
      it.each(disaggregatedFields)('negative actors.0.%s', async (field) => {
        await expectRejected(
          { actors: [{ ...baseActor(), [field]: -1 }] },
          `actors.0.${field}`,
        );
      });

      it.each(disaggregatedFields)('fractional actors.0.%s', async (field) => {
        await expectRejected(
          { actors: [{ ...baseActor(), [field]: 1.5 }] },
          `actors.0.${field}`,
        );
      });

      it('negative actors.0.actors_count', async () => {
        await expectRejected(
          {
            actors: [
              {
                actor_type_id: 1,
                sex_age_disaggregation_not_apply: true,
                actors_count: -1,
              },
            ],
          },
          'actors.0.actors_count',
        );
      });

      it('fractional actors.0.actors_count', async () => {
        await expectRejected(
          {
            actors: [
              {
                actor_type_id: 1,
                sex_age_disaggregation_not_apply: true,
                actors_count: 2.5,
              },
            ],
          },
          'actors.0.actors_count',
        );
      });

      it('negative organizations.0.organization_count', async () => {
        await expectRejected(
          { organizations: [{ organization_count: -1 }] },
          'organizations.0.organization_count',
        );
      });

      it('fractional organizations.0.organization_count', async () => {
        await expectRejected(
          { organizations: [{ organization_count: 1.2 }] },
          'organizations.0.organization_count',
        );
      });

      it('negative quantifications.0.quantification_number', async () => {
        await expectRejected(
          { quantifications: [{ quantification_number: -1 }] },
          'quantifications.0.quantification_number',
        );
      });

      it('fractional quantifications.0.quantification_number', async () => {
        await expectRejected(
          { quantifications: [{ quantification_number: 3.3 }] },
          'quantifications.0.quantification_number',
        );
      });
    });

    // Case 2 — not_apply = true + a disaggregated count → rejected (AC.3),
    // exercised on all four disaggregated fields (Lens B Issue 2 — one
    // field was a convenient proxy, KZ-002 requires the real thing), and
    // the message names the mode-flag conflict, not only the field (Lens B
    // Issue 2b).
    describe('Case 2 — not_apply true with a disaggregated count is rejected (AC.3)', () => {
      it.each(disaggregatedFields)('%s', async (field) => {
        await expectRejectedNaming(
          {
            actors: [
              {
                actor_type_id: 1,
                sex_age_disaggregation_not_apply: true,
                [field]: 5,
              },
            ],
          },
          [`actors.0.${field}`, 'sex_age_disaggregation_not_apply'],
        );
      });
    });

    // Case 3 — not_apply false/null/absent + actors_count → rejected, all
    // three shapes, plus actors_count: 0 also rejected (AC.4 keys on
    // *supplied*, not on truthiness).
    describe('Case 3 — actors_count supplied without not_apply = true is rejected', () => {
      it.each([
        ['false', false],
        ['null', null],
        ['absent', undefined],
      ])('not_apply %s', async (_label, notApply) => {
        const actor: Record<string, unknown> = {
          actor_type_id: 1,
          actors_count: 5,
        };
        if (notApply !== undefined) {
          actor.sex_age_disaggregation_not_apply = notApply;
        }
        await expectRejected({ actors: [actor] }, 'actors.0.actors_count');
      });

      it('actors_count: 0 is still rejected (supplied, not truthy)', async () => {
        await expectRejected(
          {
            actors: [
              {
                actor_type_id: 1,
                sex_age_disaggregation_not_apply: false,
                actors_count: 0,
              },
            ],
          },
          'actors.0.actors_count',
        );
      });
    });

    // Case 4 — a row missing actor_type_id is rejected (AC.6).
    it('Case 4 — a row without actor_type_id is rejected', async () => {
      await expectRejected(
        {
          actors: [{ sex_age_disaggregation_not_apply: true, actors_count: 1 }],
        },
        'actors.0.actor_type_id',
      );
    });

    // Case 5 — actor_type_id = OTHER with a blank/whitespace-only custom
    // name is rejected (AC.7).
    describe('Case 5 — OTHER actor type requires a non-blank custom name', () => {
      it.each([
        ['whitespace-only', '   '],
        ['empty string', ''],
        ['absent', undefined],
      ])('%s actor_type_custom_name', async (_label, customName) => {
        const actor: Record<string, unknown> = {
          actor_type_id: ClarisaActorTypesEnum.OTHER,
          sex_age_disaggregation_not_apply: true,
          actors_count: 1,
        };
        if (customName !== undefined) {
          actor.actor_type_custom_name = customName;
        }
        await expectRejected(
          { actors: [actor] },
          'actors.0.actor_type_custom_name',
        );
      });
    });

    // Case 6 — disaggregated mode, all four counts absent → accepted
    // (AC.8, draft-save).
    it('Case 6 — disaggregated row with all four counts absent is accepted', async () => {
      const result = await transform({
        actors: [{ actor_type_id: 1, sex_age_disaggregation_not_apply: false }],
      });
      expect(result.actors[0].actor_type_id).toBe(1);
    });

    // Case 7 — organization_count absent → accepted (R-IUA-007 AC.5).
    it('Case 7 — organizations row without organization_count is accepted', async () => {
      const result = await transform({
        organizations: [{ institution_id: 4 }],
      });
      expect(result.organizations[0].institution_id).toBe(4);
    });

    // Case 9 (T-07's own addition) — a `total` in the request is accepted,
    // not rejected, and stripped by `whitelist: true` (AC.5).
    it('Case 9 — a client-supplied total is accepted and stripped from the transformed object', async () => {
      const result = await transform({
        actors: [
          {
            actor_type_id: 1,
            sex_age_disaggregation_not_apply: false,
            women_youth_count: 2,
            women_not_youth_count: 3,
            men_youth_count: 4,
            men_not_youth_count: 1,
            total: 999,
          },
        ],
      });
      expect(result.actors[0]).not.toHaveProperty('total');
      expect(result.actors[0].women_youth_count).toBe(2);
    });

    // Scenario 2 (both-modes rejection) — the message identifies the
    // offending row by index when a sibling row is valid, AND names the
    // mode-flag conflict, not only the field (Lens B Issue 2b).
    it('identifies the offending row by index when one of several rows is invalid', async () => {
      await expectRejectedNaming(
        {
          actors: [
            {
              actor_type_id: 1,
              sex_age_disaggregation_not_apply: true,
              actors_count: 2,
            },
            {
              actor_type_id: 2,
              sex_age_disaggregation_not_apply: true,
              women_youth_count: 5,
            },
          ],
        },
        ['actors.1.women_youth_count', 'sex_age_disaggregation_not_apply'],
      );
    });
  });
});
