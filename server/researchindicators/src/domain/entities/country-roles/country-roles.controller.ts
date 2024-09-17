import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CountryRolesService } from './country-roles.service';
import { CreateCountryRoleDto } from './dto/create-country-role.dto';
import { UpdateCountryRoleDto } from './dto/update-country-role.dto';

@Controller('country-roles')
export class CountryRolesController {
  constructor(private readonly countryRolesService: CountryRolesService) {}

  @Post()
  create(@Body() createCountryRoleDto: CreateCountryRoleDto) {
    return this.countryRolesService.create(createCountryRoleDto);
  }

  @Get()
  findAll() {
    return this.countryRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countryRolesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCountryRoleDto: UpdateCountryRoleDto) {
    return this.countryRolesService.update(+id, updateCountryRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countryRolesService.remove(+id);
  }
}
