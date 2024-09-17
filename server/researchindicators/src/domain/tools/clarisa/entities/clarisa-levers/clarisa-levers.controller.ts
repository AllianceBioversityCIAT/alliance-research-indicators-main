import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';
import { CreateClarisaLeverDto } from './dto/create-clarisa-lever.dto';
import { UpdateClarisaLeverDto } from './dto/update-clarisa-lever.dto';

@Controller('clarisa-levers')
export class ClarisaLeversController {
  constructor(private readonly clarisaLeversService: ClarisaLeversService) {}

  @Post()
  create(@Body() createClarisaLeverDto: CreateClarisaLeverDto) {
    return this.clarisaLeversService.create(createClarisaLeverDto);
  }

  @Get()
  findAll() {
    return this.clarisaLeversService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaLeversService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaLeverDto: UpdateClarisaLeverDto) {
    return this.clarisaLeversService.update(+id, updateClarisaLeverDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaLeversService.remove(+id);
  }
}
