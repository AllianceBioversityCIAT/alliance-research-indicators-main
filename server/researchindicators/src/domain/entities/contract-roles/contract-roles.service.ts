import { Injectable } from '@nestjs/common';
import { CreateContractRoleDto } from './dto/create-contract-role.dto';
import { UpdateContractRoleDto } from './dto/update-contract-role.dto';

@Injectable()
export class ContractRolesService {
  create(createContractRoleDto: CreateContractRoleDto) {
    return 'This action adds a new contractRole';
  }

  findAll() {
    return `This action returns all contractRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contractRole`;
  }

  update(id: number, updateContractRoleDto: UpdateContractRoleDto) {
    return `This action updates a #${id} contractRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} contractRole`;
  }
}
