import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultLeversService } from './result-levers.service';
import { CreateResultLeverDto } from './dto/create-result-lever.dto';
import { UpdateResultLeverDto } from './dto/update-result-lever.dto';

@Controller('result-levers')
export class ResultLeversController {
  constructor(private readonly resultLeversService: ResultLeversService) {}
}
