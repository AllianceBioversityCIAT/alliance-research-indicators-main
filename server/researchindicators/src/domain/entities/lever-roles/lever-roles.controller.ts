import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeverRolesService } from './lever-roles.service';
import { CreateLeverRoleDto } from './dto/create-lever-role.dto';
import { UpdateLeverRoleDto } from './dto/update-lever-role.dto';

@Controller('lever-roles')
export class LeverRolesController {
  constructor(private readonly leverRolesService: LeverRolesService) {}

  @Post()
  create(@Body() createLeverRoleDto: CreateLeverRoleDto) {
    return this.leverRolesService.create(createLeverRoleDto);
  }

  @Get()
  findAll() {
    return this.leverRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leverRolesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeverRoleDto: UpdateLeverRoleDto) {
    return this.leverRolesService.update(+id, updateLeverRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leverRolesService.remove(+id);
  }
}
