import { Injectable } from '@nestjs/common';
import { CreateLeverRoleDto } from './dto/create-lever-role.dto';
import { UpdateLeverRoleDto } from './dto/update-lever-role.dto';

@Injectable()
export class LeverRolesService {
  create(createLeverRoleDto: CreateLeverRoleDto) {
    return 'This action adds a new leverRole';
  }

  findAll() {
    return `This action returns all leverRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} leverRole`;
  }

  update(id: number, updateLeverRoleDto: UpdateLeverRoleDto) {
    return `This action updates a #${id} leverRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} leverRole`;
  }
}
