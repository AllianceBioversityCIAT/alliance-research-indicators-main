import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { CreateReportingDto } from './dto/create-reporting.dto';
import { UpdateReportingDto } from './dto/update-reporting.dto';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post()
  create(@Body() createReportingDto: CreateReportingDto) {
    return this.reportingService.create(createReportingDto);
  }

  @Get()
  findAll() {
    return this.reportingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportingService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReportingDto: UpdateReportingDto,
  ) {
    return this.reportingService.update(+id, updateReportingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportingService.remove(+id);
  }
}
