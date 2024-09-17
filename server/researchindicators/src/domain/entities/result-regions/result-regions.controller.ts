import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { CreateResultRegionDto } from './dto/create-result-region.dto';
import { UpdateResultRegionDto } from './dto/update-result-region.dto';

@Controller('result-regions')
export class ResultRegionsController {
  constructor(private readonly resultRegionsService: ResultRegionsService) {}

  @Post()
  create(@Body() createResultRegionDto: CreateResultRegionDto) {
    return this.resultRegionsService.create(createResultRegionDto);
  }

  @Get()
  findAll() {
    return this.resultRegionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultRegionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultRegionDto: UpdateResultRegionDto) {
    return this.resultRegionsService.update(+id, updateResultRegionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultRegionsService.remove(+id);
  }
}
