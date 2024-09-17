import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContractRolesService } from './contract-roles.service';
import { CreateContractRoleDto } from './dto/create-contract-role.dto';
import { UpdateContractRoleDto } from './dto/update-contract-role.dto';

@Controller('contract-roles')
export class ContractRolesController {
  constructor(private readonly contractRolesService: ContractRolesService) {}

  @Post()
  create(@Body() createContractRoleDto: CreateContractRoleDto) {
    return this.contractRolesService.create(createContractRoleDto);
  }

  @Get()
  findAll() {
    return this.contractRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractRolesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContractRoleDto: UpdateContractRoleDto) {
    return this.contractRolesService.update(+id, updateContractRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractRolesService.remove(+id);
  }
}
