import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { UpdateResultEvidenceDto } from './dto/update-result-evidence.dto';

@Controller('result-evidences')
export class ResultEvidencesController {
  constructor(private readonly resultEvidencesService: ResultEvidencesService) {}

  @Post()
  create(@Body() createResultEvidenceDto: CreateResultEvidenceDto) {
    return this.resultEvidencesService.create(createResultEvidenceDto);
  }

  @Get()
  findAll() {
    return this.resultEvidencesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultEvidencesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultEvidenceDto: UpdateResultEvidenceDto) {
    return this.resultEvidencesService.update(+id, updateResultEvidenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultEvidencesService.remove(+id);
  }
}
