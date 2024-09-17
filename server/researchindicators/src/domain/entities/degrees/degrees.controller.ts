import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DegreesService } from './degrees.service';
import { CreateDegreeDto } from './dto/create-degree.dto';
import { UpdateDegreeDto } from './dto/update-degree.dto';

@Controller('degrees')
export class DegreesController {
  constructor(private readonly degreesService: DegreesService) {}

  @Post()
  create(@Body() createDegreeDto: CreateDegreeDto) {
    return this.degreesService.create(createDegreeDto);
  }

  @Get()
  findAll() {
    return this.degreesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.degreesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDegreeDto: UpdateDegreeDto) {
    return this.degreesService.update(+id, updateDegreeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.degreesService.remove(+id);
  }
}
