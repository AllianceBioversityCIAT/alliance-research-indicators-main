import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultInstitutionsService } from './result-institutions.service';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { UpdateResultInstitutionDto } from './dto/update-result-institution.dto';

@Controller('result-institutions')
export class ResultInstitutionsController {
  constructor(private readonly resultInstitutionsService: ResultInstitutionsService) {}

  @Post()
  create(@Body() createResultInstitutionDto: CreateResultInstitutionDto) {
    return this.resultInstitutionsService.create(createResultInstitutionDto);
  }

  @Get()
  findAll() {
    return this.resultInstitutionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultInstitutionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultInstitutionDto: UpdateResultInstitutionDto) {
    return this.resultInstitutionsService.update(+id, updateResultInstitutionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultInstitutionsService.remove(+id);
  }
}
