import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { CreatePlanningDto } from './dto/create-planning.dto';
import { UpdatePlanningDto } from './dto/update-planning.dto';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  create(@Body() createPlanningDto: CreatePlanningDto) {
    return this.planningService.create(createPlanningDto);
  }

  @Get()
  findAll() {
    return this.planningService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planningService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanningDto: UpdatePlanningDto) {
    return this.planningService.update(+id, updatePlanningDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planningService.remove(+id);
  }
}
