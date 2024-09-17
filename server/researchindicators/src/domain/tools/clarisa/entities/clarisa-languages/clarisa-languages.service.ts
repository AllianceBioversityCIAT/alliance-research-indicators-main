import { Injectable } from '@nestjs/common';
import { CreateClarisaLanguageDto } from './dto/create-clarisa-language.dto';
import { UpdateClarisaLanguageDto } from './dto/update-clarisa-language.dto';

@Injectable()
export class ClarisaLanguagesService {
  create(createClarisaLanguageDto: CreateClarisaLanguageDto) {
    return 'This action adds a new clarisaLanguage';
  }

  findAll() {
    return `This action returns all clarisaLanguages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaLanguage`;
  }

  update(id: number, updateClarisaLanguageDto: UpdateClarisaLanguageDto) {
    return `This action updates a #${id} clarisaLanguage`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaLanguage`;
  }
}
