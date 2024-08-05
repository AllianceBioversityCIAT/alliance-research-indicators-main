import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgressoContractCountriesService } from './agresso-contract-countries.service';
import { CreateAgressoContractCountryDto } from './dto/create-agresso-contract-country.dto';
import { UpdateAgressoContractCountryDto } from './dto/update-agresso-contract-country.dto';

@Controller('agresso-contract-countries')
export class AgressoContractCountriesController {
  constructor(private readonly agressoContractCountriesService: AgressoContractCountriesService) {}

  @Post()
  create(@Body() createAgressoContractCountryDto: CreateAgressoContractCountryDto) {
    return this.agressoContractCountriesService.create(createAgressoContractCountryDto);
  }

  @Get()
  findAll() {
    return this.agressoContractCountriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agressoContractCountriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgressoContractCountryDto: UpdateAgressoContractCountryDto) {
    return this.agressoContractCountriesService.update(+id, updateAgressoContractCountryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agressoContractCountriesService.remove(+id);
  }
}
