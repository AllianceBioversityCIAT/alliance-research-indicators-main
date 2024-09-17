import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { UpdateResultCountryDto } from './dto/update-result-country.dto';

@Controller('result-countries')
export class ResultCountriesController {
  constructor(private readonly resultCountriesService: ResultCountriesService) {}

  @Post()
  create(@Body() createResultCountryDto: CreateResultCountryDto) {
    return this.resultCountriesService.create(createResultCountryDto);
  }

  @Get()
  findAll() {
    return this.resultCountriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultCountriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultCountryDto: UpdateResultCountryDto) {
    return this.resultCountriesService.update(+id, updateResultCountryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultCountriesService.remove(+id);
  }
}
