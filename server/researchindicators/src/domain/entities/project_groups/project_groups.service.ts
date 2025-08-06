import { Injectable } from '@nestjs/common';
import { CreateProjectGroupDto } from './dto/create-project_group.dto';
import { UpdateProjectGroupDto } from './dto/update-project_group.dto';

@Injectable()
export class ProjectGroupsService {
  create(createProjectGroupDto: CreateProjectGroupDto) {
    return 'This action adds a new projectGroup';
  }

  findAll() {
    return `This action returns all projectGroups`;
  }

  findOne(id: number) {
    return `This action returns a #${id} projectGroup`;
  }

  update(id: number, updateProjectGroupDto: UpdateProjectGroupDto) {
    return `This action updates a #${id} projectGroup`;
  }

  remove(id: number) {
    return `This action removes a #${id} projectGroup`;
  }
}
