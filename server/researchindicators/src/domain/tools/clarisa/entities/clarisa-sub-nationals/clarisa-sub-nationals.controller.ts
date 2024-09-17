import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';
import { CreateClarisaSubNationalDto } from './dto/create-clarisa-sub-national.dto';
import { UpdateClarisaSubNationalDto } from './dto/update-clarisa-sub-national.dto';

@Controller('clarisa-sub-nationals')
export class ClarisaSubNationalsController {
  constructor(private readonly clarisaSubNationalsService: ClarisaSubNationalsService) {}

  @Post()
  create(@Body() createClarisaSubNationalDto: CreateClarisaSubNationalDto) {
    return this.clarisaSubNationalsService.create(createClarisaSubNationalDto);
  }

  @Get()
  findAll() {
    return this.clarisaSubNationalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaSubNationalsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaSubNationalDto: UpdateClarisaSubNationalDto) {
    return this.clarisaSubNationalsService.update(+id, updateClarisaSubNationalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaSubNationalsService.remove(+id);
  }
}
