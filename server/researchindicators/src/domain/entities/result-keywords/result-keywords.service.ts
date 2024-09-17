import { Injectable } from '@nestjs/common';
import { CreateResultKeywordDto } from './dto/create-result-keyword.dto';
import { UpdateResultKeywordDto } from './dto/update-result-keyword.dto';

@Injectable()
export class ResultKeywordsService {
  create(createResultKeywordDto: CreateResultKeywordDto) {
    return 'This action adds a new resultKeyword';
  }

  findAll() {
    return `This action returns all resultKeywords`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultKeyword`;
  }

  update(id: number, updateResultKeywordDto: UpdateResultKeywordDto) {
    return `This action updates a #${id} resultKeyword`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultKeyword`;
  }
}
