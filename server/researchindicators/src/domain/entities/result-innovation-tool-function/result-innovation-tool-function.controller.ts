import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultInnovationToolFunctionService } from './result-innovation-tool-function.service';
import { CreateResultInnovationToolFunctionDto } from './dto/create-result-innovation-tool-function.dto';
import { UpdateResultInnovationToolFunctionDto } from './dto/update-result-innovation-tool-function.dto';

@Controller('result-innovation-tool-function')
export class ResultInnovationToolFunctionController {
  constructor(private readonly resultInnovationToolFunctionService: ResultInnovationToolFunctionService) {}

  @Post()
  create(@Body() createResultInnovationToolFunctionDto: CreateResultInnovationToolFunctionDto) {
    return this.resultInnovationToolFunctionService.create(createResultInnovationToolFunctionDto);
  }

  @Get()
  findAll() {
    return this.resultInnovationToolFunctionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultInnovationToolFunctionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultInnovationToolFunctionDto: UpdateResultInnovationToolFunctionDto) {
    return this.resultInnovationToolFunctionService.update(+id, updateResultInnovationToolFunctionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultInnovationToolFunctionService.remove(+id);
  }
}
