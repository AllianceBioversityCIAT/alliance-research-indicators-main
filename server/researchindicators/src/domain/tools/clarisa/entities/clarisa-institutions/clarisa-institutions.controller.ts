import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { CreateClarisaInstitutionDto } from './dto/create-clarisa-institution.dto';
import { UpdateClarisaInstitutionDto } from './dto/update-clarisa-institution.dto';

@Controller('clarisa-institutions')
export class ClarisaInstitutionsController {
  constructor(private readonly clarisaInstitutionsService: ClarisaInstitutionsService) {}

  @Post()
  create(@Body() createClarisaInstitutionDto: CreateClarisaInstitutionDto) {
    return this.clarisaInstitutionsService.create(createClarisaInstitutionDto);
  }

  @Get()
  findAll() {
    return this.clarisaInstitutionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInstitutionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInstitutionDto: UpdateClarisaInstitutionDto) {
    return this.clarisaInstitutionsService.update(+id, updateClarisaInstitutionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInstitutionsService.remove(+id);
  }
}
