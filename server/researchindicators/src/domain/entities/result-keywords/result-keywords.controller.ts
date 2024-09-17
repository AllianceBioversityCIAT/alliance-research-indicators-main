import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultKeywordsService } from './result-keywords.service';
import { CreateResultKeywordDto } from './dto/create-result-keyword.dto';
import { UpdateResultKeywordDto } from './dto/update-result-keyword.dto';

@Controller('result-keywords')
export class ResultKeywordsController {
  constructor(private readonly resultKeywordsService: ResultKeywordsService) {}

  @Post()
  create(@Body() createResultKeywordDto: CreateResultKeywordDto) {
    return this.resultKeywordsService.create(createResultKeywordDto);
  }

  @Get()
  findAll() {
    return this.resultKeywordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultKeywordsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultKeywordDto: UpdateResultKeywordDto) {
    return this.resultKeywordsService.update(+id, updateResultKeywordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultKeywordsService.remove(+id);
  }
}
