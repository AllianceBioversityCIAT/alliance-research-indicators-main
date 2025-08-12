import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IndicatorPerItemService } from './indicator_per_item.service';
import { CreateIndicatorPerItemDto } from './dto/create-indicator_per_item.dto';
import { UpdateIndicatorPerItemDto } from './dto/update-indicator_per_item.dto';

@Controller('indicator-per-item')
export class IndicatorPerItemController {
  constructor(private readonly indicatorPerItemService: IndicatorPerItemService) {}

  @Post()
  create(@Body() createIndicatorPerItemDto: CreateIndicatorPerItemDto) {
    return this.indicatorPerItemService.create(createIndicatorPerItemDto);
  }

  @Get()
  findAll() {
    return this.indicatorPerItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.indicatorPerItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIndicatorPerItemDto: UpdateIndicatorPerItemDto) {
    return this.indicatorPerItemService.update(+id, updateIndicatorPerItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.indicatorPerItemService.remove(+id);
  }
}
