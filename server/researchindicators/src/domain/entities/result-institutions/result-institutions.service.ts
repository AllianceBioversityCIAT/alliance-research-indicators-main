import { Injectable } from '@nestjs/common';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { UpdateResultInstitutionDto } from './dto/update-result-institution.dto';

@Injectable()
export class ResultInstitutionsService {
  create(createResultInstitutionDto: CreateResultInstitutionDto) {
    return 'This action adds a new resultInstitution';
  }

  findAll() {
    return `This action returns all resultInstitutions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultInstitution`;
  }

  update(id: number, updateResultInstitutionDto: UpdateResultInstitutionDto) {
    return `This action updates a #${id} resultInstitution`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultInstitution`;
  }
}
