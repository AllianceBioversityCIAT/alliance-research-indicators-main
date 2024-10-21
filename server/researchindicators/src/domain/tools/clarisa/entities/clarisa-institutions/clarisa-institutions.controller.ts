import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInstitutionsController {
  constructor(
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
  ) {}

  @Get()
  async find() {
    return this.clarisaInstitutionsService.findAll().then((institutions) =>
      ResponseUtils.format({
        description: 'Institutions found',
        data: institutions,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaInstitutionsService
      .findOne<number>(+id)
      .then((institutions) =>
        ResponseUtils.format({
          description: 'Institution found',
          data: institutions,
          status: HttpStatus.OK,
        }),
      );
  }
}
