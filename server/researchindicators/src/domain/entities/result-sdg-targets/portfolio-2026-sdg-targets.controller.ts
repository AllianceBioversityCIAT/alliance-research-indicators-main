import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdatePortfolio2026SdgTargetsDto } from './dto/update-portfolio-2026-sdg-targets.dto';
import { Portfolio2026SdgTargetCatalogService } from './portfolio-2026-sdg-target-catalog.service';

@ApiTags('Portfolio 2026 SDG targets')
@ApiBearerAuth()
@Controller()
export class Portfolio2026SdgTargetsController {
  constructor(private readonly catalog: Portfolio2026SdgTargetCatalogService) {}

  @Get()
  @ApiOperation({
    summary:
      'Clarisa SDG target codes currently offered on portfolio 2026 OICRs',
  })
  async getCodes() {
    return this.catalog.getCodes().then((codes) =>
      ResponseUtils.format({
        data: { codes },
        description: 'Portfolio 2026 SDG targets retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch()
  @ApiOperation({
    summary: 'Replace the portfolio 2026 SDG target list',
  })
  @ApiBody({ type: UpdatePortfolio2026SdgTargetsDto })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UseGuards(RolesGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async replace(@Body() body: UpdatePortfolio2026SdgTargetsDto) {
    return this.catalog.replaceByTargetIds(body.sdg_target_ids).then((codes) =>
      ResponseUtils.format({
        data: { codes },
        description: 'Portfolio 2026 SDG targets updated successfully',
        status: HttpStatus.OK,
      }),
    );
  }
}
