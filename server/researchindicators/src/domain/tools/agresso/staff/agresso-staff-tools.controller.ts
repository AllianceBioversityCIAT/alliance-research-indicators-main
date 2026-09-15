// @akili-spec changes/agresso-staff-sec-users-sync (T-08 — restrict the trigger to SYSTEM_ADMIN)
import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';

@ApiBearerAuth()
@ApiTags('Agresso Connection')
@Controller()
export class AgressoStaffToolsController {
  constructor(
    private readonly agressoStaffToolsService: AgressoStaffToolsService,
  ) {}

  /**
   * ⚠️ **Breaking change for any non-admin caller (R-AGS-006).** This endpoint was previously
   * reachable by any authenticated user — it carried only `@ApiBearerAuth()`, a Swagger decorator,
   * never a guard. The gap is pre-existing; what this spec changed is its *consequence*, from
   * "resynced a lookup table" to "created accounts and granted CONTRIBUTOR".
   *
   * The guard sits on the CONTROLLER, not inside the service (DD-10): the handler below does not
   * `await` the service, so a permission check placed inside it would let the whole reconciliation
   * begin and still return a refusal. A guard refuses before the handler body runs.
   *
   * Side effect, not a fix: `RolesGuard` denies a null `req.user` only on `@Roles`-decorated
   * routes, so this also shuts out RSK-6's null-user machine token **on this route only**. RSK-6
   * remains live everywhere else and deserves its own bugfix spec.
   */
  @Get('clone/execute')
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({
    summary:
      'Trigger the Agresso staff sync and reconcile platform accounts (SYSTEM_ADMIN only)',
  })
  runCloneClarisa() {
    this.agressoStaffToolsService.cloneAllAgressoStaff();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }
}
