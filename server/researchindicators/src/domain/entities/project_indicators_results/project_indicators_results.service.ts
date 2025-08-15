import { Injectable } from '@nestjs/common';
import { CreateProjectIndicatorsResultDto } from './dto/create-project_indicators_result.dto';
import { UpdateProjectIndicatorsResultDto } from './dto/update-project_indicators_result.dto';

@Injectable()
export class ProjectIndicatorsResultsService {
  create(createProjectIndicatorsResultDto: CreateProjectIndicatorsResultDto) {
    return 'This action adds a new projectIndicatorsResult';
  }

  findAll() {
    return `This action returns all projectIndicatorsResults`;
  }

  findOne(id: number) {
    return `This action returns a #${id} projectIndicatorsResult`;
  }

  update(id: number, updateProjectIndicatorsResultDto: UpdateProjectIndicatorsResultDto) {
    return `This action updates a #${id} projectIndicatorsResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} projectIndicatorsResult`;
  }
}
