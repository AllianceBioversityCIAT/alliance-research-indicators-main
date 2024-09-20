import { Injectable } from '@nestjs/common';
import { CreateResultUserDto } from './dto/create-result-user.dto';
import { UpdateResultUserDto } from './dto/update-result-user.dto';

@Injectable()
export class ResultUsersService {
  create(createResultUserDto: CreateResultUserDto) {
    return 'This action adds a new resultUser';
  }

  findAll() {
    return `This action returns all resultUsers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultUser`;
  }

  update(id: number, updateResultUserDto: UpdateResultUserDto) {
    return `This action updates a #${id} resultUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultUser`;
  }
}
