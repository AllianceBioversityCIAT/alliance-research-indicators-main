import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaLanguagesService } from './clarisa-languages.service';
import { CreateClarisaLanguageDto } from './dto/create-clarisa-language.dto';
import { UpdateClarisaLanguageDto } from './dto/update-clarisa-language.dto';

@Controller('clarisa-languages')
export class ClarisaLanguagesController {
  constructor(private readonly clarisaLanguagesService: ClarisaLanguagesService) {}

  @Post()
  create(@Body() createClarisaLanguageDto: CreateClarisaLanguageDto) {
    return this.clarisaLanguagesService.create(createClarisaLanguageDto);
  }

  @Get()
  findAll() {
    return this.clarisaLanguagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaLanguagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaLanguageDto: UpdateClarisaLanguageDto) {
    return this.clarisaLanguagesService.update(+id, updateClarisaLanguageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaLanguagesService.remove(+id);
  }
}
