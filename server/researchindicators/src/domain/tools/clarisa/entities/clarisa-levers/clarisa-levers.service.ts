import { Injectable } from '@nestjs/common';
import { CreateClarisaLeverDto } from './dto/create-clarisa-lever.dto';
import { UpdateClarisaLeverDto } from './dto/update-clarisa-lever.dto';

@Injectable()
export class ClarisaLeversService {
  create(createClarisaLeverDto: CreateClarisaLeverDto) {
    return 'This action adds a new clarisaLever';
  }

  findAll() {
    return `This action returns all clarisaLevers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaLever`;
  }

  update(id: number, updateClarisaLeverDto: UpdateClarisaLeverDto) {
    return `This action updates a #${id} clarisaLever`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaLever`;
  }
}
