import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AutomapperService } from './automapper.service';
import {
  AutomapperApplyResponseDto,
  AutomapperCoverageQueryDto,
  AutomapperPreviewResponseDto,
  AutomapperRunRequestDto,
} from './dto/automapper-run.dto';

type RequestWithUser = Request & { user?: User };

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 / R-CAM-002
// (scenario, AC.1, AC.3, and its `BUT it must NOT` on cron); design.md §4,
// §8, DD-3.
//
// Three endpoints on the same admin gate as the sibling
// BilateralProjectMappingController: POST auto-map/preview (read-only),
// POST auto-map/apply (the ONLY mutating endpoint), GET coverage. Mounted
// under `bilateral-project-mappings` via RouterModule (main.routes.ts) —
// this class's own @Controller() carries no prefix of its own, so its
// paths are exactly auto-map/preview, auto-map/apply and coverage.
//
// ⚠️ REGISTRATION ORDER (T-05 Finding 3 — the route-ordering scar this
// module already carries once, see the `coverage-report` comment in
// bilateral-project-mapping.controller.ts). This controller owns
// `GET coverage`; BilateralProjectMappingController owns `GET :id`. Nest
// registers each module's controllers' routes onto the underlying Express
// router in the ORDER they appear in @Module({ controllers: [...] }) —
// first controller registered wins a routing conflict, not the more
// specific path. AutomapperController MUST be listed BEFORE
// BilateralProjectMappingController in bilateral-project-mapping.module.ts,
// or GET .../coverage matches `:id` first and ParseIntPipe throws trying
// to parse the literal string "coverage" as a number.
//
// ⚠️ apply() NEVER accepts a candidate list from the request body — see
// AutomapperRunRequestDto: the body carries `phase` and nothing else.
// `resolved` is ALWAYS re-derived server-side via automapperService.resolve()
// (execution.md T-03 "FORWARD POINTERS TO T-05" #1). Accepting a
// caller-supplied {clarisaProjectId, derivedContractId} list would let any
// admin POST arbitrary pairs and have them written as DERIVED rows,
// bypassing R-CAM-001's AGRESSO-existence confirmation entirely.
//
// No scheduling decorator anywhere in this module — R-CAM-002 forbids
// running the matcher on a schedule in this version; it is admin-triggered
// only (grep this file and its siblings for the Nest scheduling decorator
// to confirm — none should appear).
@ApiTags('Bilateral / Auto-Mapper')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
@Controller()
export class AutomapperController {
  // design.md §9 — "Each run writes one LoggerUtil summary: cohort size,
  // the four bucket counts, feed timestamp, and whether it was preview or
  // apply." RB-3's stated mitigation for a 194-row bulk write surprising
  // an admin. This clause had no task owner in tasks.md §3 (coverage table
  // is clause-level for requirements only); it belongs here because this
  // controller is the only place that sees both a run's classification
  // AND its preview-vs-apply identity in one place.
  private readonly logger = new LoggerUtil({ name: AutomapperController.name });

  constructor(private readonly automapperService: AutomapperService) {}

  @Post('auto-map/preview')
  @ApiOperation({
    summary:
      'Preview an automapper run: resolve + classify against the current mapping table. Writes nothing.',
  })
  @ApiBody({ type: AutomapperRunRequestDto, required: false })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async preview(@Body() body?: AutomapperRunRequestDto) {
    const report = await this.buildPreviewReport(body?.phase);
    return ResponseUtils.format({
      data: report,
      description: 'Automapper preview generated (no rows written)',
      status: HttpStatus.OK,
    });
  }

  @Post('auto-map/apply')
  @ApiOperation({
    summary:
      'Apply an automapper run. The only mutating endpoint — derives its own candidate set server-side.',
  })
  @ApiBody({ type: AutomapperRunRequestDto, required: false })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async apply(
    @Req() request: RequestWithUser,
    @Body() body?: AutomapperRunRequestDto,
  ) {
    // `resolved` comes ONLY from this call — never from `body`. There is no
    // field on AutomapperRunRequestDto a caller could use to smuggle a
    // candidate list through even by mistake (T-05 Finding 1).
    const { resolved, ambiguous, unresolved } =
      await this.automapperService.resolve(body?.phase);
    const feedFetchedAt = this.automapperService.getFeedFetchedAt();
    const applyResult = await this.automapperService.apply(
      resolved,
      request.user,
    );

    const report: AutomapperApplyResponseDto = {
      feedFetchedAt: feedFetchedAt
        ? new Date(feedFetchedAt).toISOString()
        : null,
      counts: {
        created: applyResult.created,
        alreadyMapped: applyResult.alreadyMapped,
        ambiguous: ambiguous.length,
        unresolved: unresolved.length,
        divergent: applyResult.divergent,
        superseded: applyResult.superseded,
      },
      ambiguous,
      unresolved,
    };

    // design.md §9 — one summary line per run: cohort size, the four
    // bucket counts, feed timestamp, preview vs apply (this is apply).
    // divergent/superseded ride along even though they are outside §9's
    // literal "four counts": RB-3's stated purpose for this line is "the
    // answer to why do I have 194 new rows", and a supersede deactivates
    // one row AND inserts another — omitting it would leave `created`
    // reading as an undercount of what the run actually wrote (T-05
    // rework, closer #1).
    const cohortSize = resolved.length + ambiguous.length + unresolved.length;
    this.logger._log(
      `automapper apply: cohort=${cohortSize}, created=${report.counts.created}, ` +
        `alreadyMapped=${report.counts.alreadyMapped}, ambiguous=${report.counts.ambiguous}, ` +
        `unresolved=${report.counts.unresolved}, divergent=${report.counts.divergent}, ` +
        `superseded=${report.counts.superseded}, feedFetchedAt=${report.feedFetchedAt ?? 'unknown'}`,
    );

    return ResponseUtils.format({
      data: report,
      description: 'Automapper run applied',
      status: HttpStatus.OK,
    });
  }

  // MUST stay declared here, in AutomapperController — see the
  // class-level registration-order comment (T-05 Finding 3).
  @Get('coverage')
  @ApiOperation({
    summary:
      'Automapper coverage: mapped / pending / reachable against the eligible cohort (never a contract-table denominator).',
  })
  @ApiQuery({
    name: 'phase',
    required: false,
    type: Number,
    description: 'CLARISA phase filter override (e.g. 2026)',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async coverage(@Query() query: AutomapperCoverageQueryDto) {
    const data = await this.automapperService.coverage(query?.phase);
    return ResponseUtils.format({
      data,
      description: 'Automapper coverage computed',
      status: HttpStatus.OK,
    });
  }

  /**
   * Preview NEVER writes: it calls resolve() + classify() only, never
   * apply() (the F1 falsifier in T-05's brief — mutating this method to
   * call apply() must redden a write-count test, not a status-code test).
   */
  private async buildPreviewReport(
    phase?: number,
  ): Promise<AutomapperPreviewResponseDto> {
    const { resolved, ambiguous, unresolved } =
      await this.automapperService.resolve(phase);
    const feedFetchedAt = this.automapperService.getFeedFetchedAt();
    const classification = await this.automapperService.classify(resolved);

    const report: AutomapperPreviewResponseDto = {
      feedFetchedAt: feedFetchedAt
        ? new Date(feedFetchedAt).toISOString()
        : null,
      counts: {
        toCreate: classification.toCreate.length,
        alreadyMapped: classification.alreadyMapped.length,
        ambiguous: ambiguous.length,
        unresolved: unresolved.length,
        divergent: classification.divergent.length,
        supersede: classification.supersede.length,
      },
      toCreate: classification.toCreate,
      alreadyMapped: classification.alreadyMapped,
      ambiguous,
      unresolved,
      divergent: classification.divergent,
      supersede: classification.supersede,
    };

    // design.md §9 — one summary line per run: cohort size, the four
    // bucket counts, feed timestamp, preview vs apply (this is preview).
    const cohortSize = resolved.length + ambiguous.length + unresolved.length;
    this.logger._log(
      `automapper preview: cohort=${cohortSize}, toCreate=${report.counts.toCreate}, ` +
        `alreadyMapped=${report.counts.alreadyMapped}, ambiguous=${report.counts.ambiguous}, ` +
        `unresolved=${report.counts.unresolved}, feedFetchedAt=${report.feedFetchedAt ?? 'unknown'}`,
    );

    return report;
  }
}
