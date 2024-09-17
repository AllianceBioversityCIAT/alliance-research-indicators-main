import { Injectable } from '@nestjs/common';
import { CreateSessionTypeDto } from './dto/create-session-type.dto';
import { UpdateSessionTypeDto } from './dto/update-session-type.dto';

@Injectable()
export class SessionTypesService {
  create(createSessionTypeDto: CreateSessionTypeDto) {
    return 'This action adds a new sessionType';
  }

  findAll() {
    return `This action returns all sessionTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sessionType`;
  }

  update(id: number, updateSessionTypeDto: UpdateSessionTypeDto) {
    return `This action updates a #${id} sessionType`;
  }

  remove(id: number) {
    return `This action removes a #${id} sessionType`;
  }
}
