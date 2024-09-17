import { Injectable } from '@nestjs/common';
import { CreateSessionFormatDto } from './dto/create-session-format.dto';
import { UpdateSessionFormatDto } from './dto/update-session-format.dto';

@Injectable()
export class SessionFormatsService {
  create(createSessionFormatDto: CreateSessionFormatDto) {
    return 'This action adds a new sessionFormat';
  }

  findAll() {
    return `This action returns all sessionFormats`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sessionFormat`;
  }

  update(id: number, updateSessionFormatDto: UpdateSessionFormatDto) {
    return `This action updates a #${id} sessionFormat`;
  }

  remove(id: number) {
    return `This action removes a #${id} sessionFormat`;
  }
}
