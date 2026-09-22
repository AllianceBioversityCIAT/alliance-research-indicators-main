import { Controller, Get, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  PrmsWebhookReadResponseDto,
  PrmsWebhookRegisterResponseDto,
} from './dto/prms-webhook.dto';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03 /
// R-PWH-001, R-PWH-002, R-PWH-009. design.md §3.1, §5, §6.1, §6.2, DD-2.
// SYSTEM_ADMIN-only operator surface — registration is an operated action,
// never automatic at boot (DD-2, K-005).
@ApiTags('PRMS Webhook Registration')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(SecRolesEnum.SYSTEM_ADMIN)
@Controller()
export class PrmsWebhookRegistrationController {
  constructor(
    private readonly registrationService: PrmsWebhookRegistrationService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      "Register STAR's callback URL with PRMS (ARI_PRMS_WEBHOOK_CALLBACK_URL). No body — the URL is never taken from the request.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PrmsWebhookRegisterResponseDto,
    description: 'Webhook registered (or re-registered — an upsert)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ARI_CLARISA_API_KEY row is missing or inactive',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description:
      'ARI_PRMS_WEBHOOK_CALLBACK_URL, ARI_PRMS_NORMALIZER_HOST, or the ARI_CLARISA_API_KEY value is unset',
  })
  async register() {
    const result = await this.registrationService.register();
    return ResponseUtils.format({
      data: result,
      description: result.message || 'Webhook registered successfully',
      status: HttpStatus.OK,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Read the destination PRMS currently holds for STAR',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PrmsWebhookReadResponseDto,
    description:
      'Success envelope in both cases — "nothing registered" is NOT a 404',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ARI_CLARISA_API_KEY row is missing or inactive',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description:
      'ARI_PRMS_NORMALIZER_HOST or the ARI_CLARISA_API_KEY value is unset',
  })
  async read() {
    const result = await this.registrationService.read();
    return ResponseUtils.format({
      data: result,
      description: result.message || 'Webhook destination retrieved',
      status: HttpStatus.OK,
    });
  }
}
