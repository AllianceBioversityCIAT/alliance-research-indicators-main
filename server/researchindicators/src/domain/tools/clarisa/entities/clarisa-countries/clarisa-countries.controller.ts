import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { CreateClarisaCountryDto } from './dto/create-clarisa-country.dto';
import { UpdateClarisaCountryDto } from './dto/update-clarisa-country.dto';

@Controller('clarisa-countries')
export class ClarisaCountriesController {
  constructor(private readonly clarisaCountriesService: ClarisaCountriesService) {}

  @Post()
  create(@Body() createClarisaCountryDto: CreateClarisaCountryDto) {
    return this.clarisaCountriesService.create(createClarisaCountryDto);
  }

  @Get()
  findAll() {
    return this.clarisaCountriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCountriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaCountryDto: UpdateClarisaCountryDto) {
    return this.clarisaCountriesService.update(+id, updateClarisaCountryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCountriesService.remove(+id);
  }
}
