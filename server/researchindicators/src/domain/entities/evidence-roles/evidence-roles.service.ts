import { Injectable } from '@nestjs/common';
import { CreateEvidenceRoleDto } from './dto/create-evidence-role.dto';
import { UpdateEvidenceRoleDto } from './dto/update-evidence-role.dto';

@Injectable()
export class EvidenceRolesService {
  create(createEvidenceRoleDto: CreateEvidenceRoleDto) {
    return 'This action adds a new evidenceRole';
  }

  findAll() {
    return `This action returns all evidenceRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evidenceRole`;
  }

  update(id: number, updateEvidenceRoleDto: UpdateEvidenceRoleDto) {
    return `This action updates a #${id} evidenceRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} evidenceRole`;
  }
}
