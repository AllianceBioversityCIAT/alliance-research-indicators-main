// @sdd-spec results/cross-platform-duplicate-resolution
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { DenyMachineTokenGuard } from '../../shared/guards/deny-machine-token.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { DuplicateResolutionService } from './duplicate-resolution.service';
import {
  ApplyDuplicateResolutionDto,
  DuplicateResolutionFilterDto,
} from './dto/duplicate-resolution.dto';

/**
 * Admin surface for cross-platform duplicate resolution — the rules path AICCRA
 * never had, since it reaches `results` through a MySQL script rather than a sync
 * pipeline.
 *
 * Two verbs rather than one `mode` parameter: a `GET` that cannot write is a
 * stronger guarantee than a `POST` that promises not to.
 *
 * `DenyMachineTokenGuard` sits alongside `RolesGuard` because roles alone are not
 * enough here. `app_secret_host_list` is an origin allowlist for the whole token
 * and a secret with zero host rows skips the origin check, so a machine token whose
 * responsible user holds `SYSTEM_ADMIN` would otherwise satisfy `@Roles`.
 */
@ApiTags('Results — duplicate resolution')
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard, DenyMachineTokenGuard)
export class DuplicateResolutionController {
  constructor(private readonly service: DuplicateResolutionService) {}

  @Get('duplicate-resolution/plan')
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Compute a cross-platform duplicate resolution plan (dry run)',
    description:
      'Scans for public links duplicated across PRMS, TIP and AICCRA and returns what WOULD be deleted. Writes nothing to results or any child table — the only write is the audit run row that makes the plan retrievable for apply. Review the plan, then pass its runId and confirmationDigest to the apply endpoint.',
  })
  @ApiQuery({
    name: 'reportYear',
    required: false,
    type: Number,
    description: 'Restrict the scan to one report year.',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    isArray: true,
    type: String,
    description: 'Restrict the scan to these platforms (PRMS, TIP, AICCRA).',
  })
  @ApiQuery({
    name: 'indicator',
    required: false,
    isArray: true,
    type: Number,
    description: 'Restrict the scan to these indicator ids.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cap the number of groups scanned.',
  })
  async plan(@Query() filters: DuplicateResolutionFilterDto) {
    const plan = await this.service.plan(filters);
    return ResponseUtils.format({
      description:
        plan.status === 'INCONCLUSIVE'
          ? 'No duplicate groups matched this filter'
          : `Plan for ${plan.groupCount} duplicate group(s)`,
      data: plan,
      status: 200,
    });
  }

  @Post('duplicate-resolution/apply')
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Apply a reviewed duplicate resolution plan',
    description:
      'Re-derives the plan and executes it only if the confirmation digest still matches and the plan was reviewed within the configured window. Deletion is irreversible: recovery is a re-sync from the source platform, and AICCRA has no automatic sync. Refuses with 409 on a digest mismatch or an expired plan, and with 400 when no such plan exists.',
  })
  @ApiBody({ type: ApplyDuplicateResolutionDto })
  async apply(@Body() body: ApplyDuplicateResolutionDto) {
    const plan = await this.service.apply({
      runId: body.runId,
      confirmationDigest: body.confirmationDigest,
      filters: body.filters ?? {},
    });
    return ResponseUtils.format({
      description: `Applied plan: ${plan.rowsToDelete} row(s) in ${plan.groupCount} group(s)`,
      data: plan,
      status: 200,
    });
  }
}
