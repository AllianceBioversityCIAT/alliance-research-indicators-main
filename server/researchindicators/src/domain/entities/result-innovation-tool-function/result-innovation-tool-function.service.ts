import { Injectable } from '@nestjs/common';
import { CreateResultInnovationToolFunctionDto } from './dto/create-result-innovation-tool-function.dto';
import { UpdateResultInnovationToolFunctionDto } from './dto/update-result-innovation-tool-function.dto';

@Injectable()
export class ResultInnovationToolFunctionService {
  create(createResultInnovationToolFunctionDto: CreateResultInnovationToolFunctionDto) {
    return 'This action adds a new resultInnovationToolFunction';
  }

  findAll() {
    return `This action returns all resultInnovationToolFunction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultInnovationToolFunction`;
  }

  update(id: number, updateResultInnovationToolFunctionDto: UpdateResultInnovationToolFunctionDto) {
    return `This action updates a #${id} resultInnovationToolFunction`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultInnovationToolFunction`;
  }
}
