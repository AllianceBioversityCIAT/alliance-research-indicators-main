import { Injectable } from '@nestjs/common';
import { CreatePlanningDto } from './dto/create-planning.dto';
import { UpdatePlanningDto } from './dto/update-planning.dto';

@Injectable()
export class PlanningService {
  create(createPlanningDto: CreatePlanningDto) {
    return 'This action adds a new planning';
  }

  findAll() {
    return `This action returns all planning`;
  }

  findOne(id: number) {
    return `This action returns a #${id} planning`;
  }

  update(id: number, updatePlanningDto: UpdatePlanningDto) {
    return `This action updates a #${id} planning`;
  }

  remove(id: number) {
    return `This action removes a #${id} planning`;
  }
}
