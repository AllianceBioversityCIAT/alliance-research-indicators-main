import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultCountriesSubNationalsService } from './result-countries-sub-nationals.service';
import { CreateResultCountriesSubNationalDto } from './dto/create-result-countries-sub-national.dto';
import { UpdateResultCountriesSubNationalDto } from './dto/update-result-countries-sub-national.dto';

@Controller('result-countries-sub-nationals')
export class ResultCountriesSubNationalsController {
  constructor(private readonly resultCountriesSubNationalsService: ResultCountriesSubNationalsService) {}

  @Post()
  create(@Body() createResultCountriesSubNationalDto: CreateResultCountriesSubNationalDto) {
    return this.resultCountriesSubNationalsService.create(createResultCountriesSubNationalDto);
  }

  @Get()
  findAll() {
    return this.resultCountriesSubNationalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultCountriesSubNationalsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultCountriesSubNationalDto: UpdateResultCountriesSubNationalDto) {
    return this.resultCountriesSubNationalsService.update(+id, updateResultCountriesSubNationalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultCountriesSubNationalsService.remove(+id);
  }
}
