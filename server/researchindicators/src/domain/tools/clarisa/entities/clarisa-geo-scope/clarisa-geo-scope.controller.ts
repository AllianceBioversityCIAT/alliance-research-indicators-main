import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
import { CreateClarisaGeoScopeDto } from './dto/create-clarisa-geo-scope.dto';
import { UpdateClarisaGeoScopeDto } from './dto/update-clarisa-geo-scope.dto';

@Controller('clarisa-geo-scope')
export class ClarisaGeoScopeController {
  constructor(private readonly clarisaGeoScopeService: ClarisaGeoScopeService) {}

  @Post()
  create(@Body() createClarisaGeoScopeDto: CreateClarisaGeoScopeDto) {
    return this.clarisaGeoScopeService.create(createClarisaGeoScopeDto);
  }

  @Get()
  findAll() {
    return this.clarisaGeoScopeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaGeoScopeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaGeoScopeDto: UpdateClarisaGeoScopeDto) {
    return this.clarisaGeoScopeService.update(+id, updateClarisaGeoScopeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaGeoScopeService.remove(+id);
  }
}
