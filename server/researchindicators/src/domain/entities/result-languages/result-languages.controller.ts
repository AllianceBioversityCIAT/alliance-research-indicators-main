import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultLanguagesService } from './result-languages.service';
import { CreateResultLanguageDto } from './dto/create-result-language.dto';
import { UpdateResultLanguageDto } from './dto/update-result-language.dto';

@Controller('result-languages')
export class ResultLanguagesController {
  constructor(private readonly resultLanguagesService: ResultLanguagesService) {}

  @Post()
  create(@Body() createResultLanguageDto: CreateResultLanguageDto) {
    return this.resultLanguagesService.create(createResultLanguageDto);
  }

  @Get()
  findAll() {
    return this.resultLanguagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultLanguagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultLanguageDto: UpdateResultLanguageDto) {
    return this.resultLanguagesService.update(+id, updateResultLanguageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultLanguagesService.remove(+id);
  }
}
