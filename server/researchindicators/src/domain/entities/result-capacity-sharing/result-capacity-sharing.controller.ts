import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { CreateResultCapacitySharingDto } from './dto/create-result-capacity-sharing.dto';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';

@Controller('result-capacity-sharing')
export class ResultCapacitySharingController {
  constructor(private readonly resultCapacitySharingService: ResultCapacitySharingService) {}

  @Post()
  create(@Body() createResultCapacitySharingDto: CreateResultCapacitySharingDto) {
    return this.resultCapacitySharingService.create(createResultCapacitySharingDto);
  }

  @Get()
  findAll() {
    return this.resultCapacitySharingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultCapacitySharingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultCapacitySharingDto: UpdateResultCapacitySharingDto) {
    return this.resultCapacitySharingService.update(+id, updateResultCapacitySharingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultCapacitySharingService.remove(+id);
  }
}
