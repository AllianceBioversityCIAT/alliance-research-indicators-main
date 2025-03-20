import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaLanguagesService } from './clarisa-languages.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaLanguagesController {
  constructor(
    private readonly clarisaLanguagesService: ClarisaLanguagesService,
  ) {}

  @Get()
  async find() {
    return this.clarisaLanguagesService.findAll().then((languages) =>
      ResponseUtils.format({
        description: 'Languages found',
        data: languages,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaLanguagesService.findOne<number>(+id).then((languages) =>
      ResponseUtils.format({
        description: 'Languages found',
        data: languages,
        status: HttpStatus.OK,
      }),
    );
  }
}
