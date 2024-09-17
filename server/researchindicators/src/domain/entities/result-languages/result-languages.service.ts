import { Injectable } from '@nestjs/common';
import { CreateResultLanguageDto } from './dto/create-result-language.dto';
import { UpdateResultLanguageDto } from './dto/update-result-language.dto';

@Injectable()
export class ResultLanguagesService {
  create(createResultLanguageDto: CreateResultLanguageDto) {
    return 'This action adds a new resultLanguage';
  }

  findAll() {
    return `This action returns all resultLanguages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultLanguage`;
  }

  update(id: number, updateResultLanguageDto: UpdateResultLanguageDto) {
    return `This action updates a #${id} resultLanguage`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultLanguage`;
  }
}
