import { Injectable } from '@nestjs/common';
import { CreateClarisaSubNationalDto } from './dto/create-clarisa-sub-national.dto';
import { UpdateClarisaSubNationalDto } from './dto/update-clarisa-sub-national.dto';

@Injectable()
export class ClarisaSubNationalsService {
  create(createClarisaSubNationalDto: CreateClarisaSubNationalDto) {
    return 'This action adds a new clarisaSubNational';
  }

  findAll() {
    return `This action returns all clarisaSubNationals`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaSubNational`;
  }

  update(id: number, updateClarisaSubNationalDto: UpdateClarisaSubNationalDto) {
    return `This action updates a #${id} clarisaSubNational`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaSubNational`;
  }
}
