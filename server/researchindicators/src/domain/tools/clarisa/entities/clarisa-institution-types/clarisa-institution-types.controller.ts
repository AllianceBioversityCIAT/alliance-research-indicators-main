import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { CreateClarisaInstitutionTypeDto } from './dto/create-clarisa-institution-type.dto';
import { UpdateClarisaInstitutionTypeDto } from './dto/update-clarisa-institution-type.dto';

@Controller('clarisa-institution-types')
export class ClarisaInstitutionTypesController {
  constructor(private readonly clarisaInstitutionTypesService: ClarisaInstitutionTypesService) {}

  @Post()
  create(@Body() createClarisaInstitutionTypeDto: CreateClarisaInstitutionTypeDto) {
    return this.clarisaInstitutionTypesService.create(createClarisaInstitutionTypeDto);
  }

  @Get()
  findAll() {
    return this.clarisaInstitutionTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInstitutionTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInstitutionTypeDto: UpdateClarisaInstitutionTypeDto) {
    return this.clarisaInstitutionTypesService.update(+id, updateClarisaInstitutionTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInstitutionTypesService.remove(+id);
  }
}
