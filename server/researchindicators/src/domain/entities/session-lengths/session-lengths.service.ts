import { Injectable } from '@nestjs/common';
import { CreateSessionLengthDto } from './dto/create-session-length.dto';
import { UpdateSessionLengthDto } from './dto/update-session-length.dto';

@Injectable()
export class SessionLengthsService {
  create(createSessionLengthDto: CreateSessionLengthDto) {
    return 'This action adds a new sessionLength';
  }

  findAll() {
    return `This action returns all sessionLengths`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sessionLength`;
  }

  update(id: number, updateSessionLengthDto: UpdateSessionLengthDto) {
    return `This action updates a #${id} sessionLength`;
  }

  remove(id: number) {
    return `This action removes a #${id} sessionLength`;
  }
}
