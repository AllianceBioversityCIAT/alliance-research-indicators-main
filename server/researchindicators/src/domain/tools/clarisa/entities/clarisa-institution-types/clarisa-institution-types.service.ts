import { Injectable } from '@nestjs/common';
import { CreateClarisaInstitutionTypeDto } from './dto/create-clarisa-institution-type.dto';
import { UpdateClarisaInstitutionTypeDto } from './dto/update-clarisa-institution-type.dto';

@Injectable()
export class ClarisaInstitutionTypesService {
  create(createClarisaInstitutionTypeDto: CreateClarisaInstitutionTypeDto) {
    return 'This action adds a new clarisaInstitutionType';
  }

  findAll() {
    return `This action returns all clarisaInstitutionTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInstitutionType`;
  }

  update(id: number, updateClarisaInstitutionTypeDto: UpdateClarisaInstitutionTypeDto) {
    return `This action updates a #${id} clarisaInstitutionType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInstitutionType`;
  }
}
