import { Injectable } from '@nestjs/common';
import { CreateReportingDto } from './dto/create-reporting.dto';
import { UpdateReportingDto } from './dto/update-reporting.dto';

@Injectable()
export class ReportingService {
  create(createReportingDto: CreateReportingDto) {
    return 'This action adds a new reporting';
  }

  findAll() {
    return `This action returns all reporting`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reporting`;
  }

  update(id: number, updateReportingDto: UpdateReportingDto) {
    return `This action updates a #${id} reporting`;
  }

  remove(id: number) {
    return `This action removes a #${id} reporting`;
  }
}
