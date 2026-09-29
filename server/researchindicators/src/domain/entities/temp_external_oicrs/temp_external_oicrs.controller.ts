import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ExternalOicrSourceEnum } from './enum/external-oicr-source.enum';

@Controller()
@ApiTags('Temporary External OICRs')
@ApiBearerAuth()
export class TempExternalOicrsController {
  constructor(private readonly service: TempExternalOicrsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Existing OICRs to link: TEMP_external_oicrs rows plus OICR results reported before OICR.REPORTING_YEAR',
  })
  async findAll() {
    return this.service.findExternalOicrs().then((res) =>
      ResponseUtils.format({
        data: res,
        description: 'results found correctly',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id/metadata')
  @ApiOperation({ summary: 'Prefill data of an existing OICR' })
  @ApiParam({
    name: 'id',
    type: Number,
    description:
      'TEMP_external_oicrs id, or results.result_id when source=result',
  })
  @ApiQuery({
    name: 'source',
    enum: ExternalOicrSourceEnum,
    required: false,
    description: 'Table the id belongs to. Defaults to external.',
  })
  async findMetadata(
    @Param('id') id: number,
    @Query('source') source?: ExternalOicrSourceEnum,
  ) {
    if (
      source != null &&
      !Object.values(ExternalOicrSourceEnum).includes(source)
    ) {
      throw new BadRequestException(`Invalid source: ${source}`);
    }
    const leverList = await this.service.mappingExternalOicrs(id, source);
    return ResponseUtils.format({
      data: leverList,
      description: 'results found correctly',
      status: HttpStatus.OK,
    });
  }
}
