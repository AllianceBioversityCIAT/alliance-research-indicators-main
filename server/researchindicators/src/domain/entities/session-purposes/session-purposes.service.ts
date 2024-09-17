import { Injectable } from '@nestjs/common';
import { CreateSessionPurposeDto } from './dto/create-session-purpose.dto';
import { UpdateSessionPurposeDto } from './dto/update-session-purpose.dto';

@Injectable()
export class SessionPurposesService {
  create(createSessionPurposeDto: CreateSessionPurposeDto) {
    return 'This action adds a new sessionPurpose';
  }

  findAll() {
    return `This action returns all sessionPurposes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sessionPurpose`;
  }

  update(id: number, updateSessionPurposeDto: UpdateSessionPurposeDto) {
    return `This action updates a #${id} sessionPurpose`;
  }

  remove(id: number) {
    return `This action removes a #${id} sessionPurpose`;
  }
}
