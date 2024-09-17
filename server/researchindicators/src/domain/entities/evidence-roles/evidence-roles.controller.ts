import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EvidenceRolesService } from './evidence-roles.service';
import { CreateEvidenceRoleDto } from './dto/create-evidence-role.dto';
import { UpdateEvidenceRoleDto } from './dto/update-evidence-role.dto';

@Controller('evidence-roles')
export class EvidenceRolesController {
  constructor(private readonly evidenceRolesService: EvidenceRolesService) {}

  @Post()
  create(@Body() createEvidenceRoleDto: CreateEvidenceRoleDto) {
    return this.evidenceRolesService.create(createEvidenceRoleDto);
  }

  @Get()
  findAll() {
    return this.evidenceRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evidenceRolesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEvidenceRoleDto: UpdateEvidenceRoleDto) {
    return this.evidenceRolesService.update(+id, updateEvidenceRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evidenceRolesService.remove(+id);
  }
}
