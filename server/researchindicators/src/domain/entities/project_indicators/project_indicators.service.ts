import { Injectable } from '@nestjs/common';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';
import { UpdateProjectIndicatorDto } from './dto/update-project_indicator.dto';

@Injectable()
export class ProjectIndicatorsService {
  create(createProjectIndicatorDto: CreateProjectIndicatorDto) {
    return 'This action adds a new projectIndicator';
  }

  findAll() {
    return `This action returns all projectIndicators`;
  }

  findOne(id: number) {
    return `This action returns a #${id} projectIndicator`;
  }

  update(id: number, updateProjectIndicatorDto: UpdateProjectIndicatorDto) {
    return `This action updates a #${id} projectIndicator`;
  }

  remove(id: number) {
    return `This action removes a #${id} projectIndicator`;
  }
}
