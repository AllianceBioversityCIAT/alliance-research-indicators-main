import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultContractsService } from './result-contracts.service';
import { CreateResultContractDto } from './dto/create-result-contract.dto';
import { UpdateResultContractDto } from './dto/update-result-contract.dto';

@Controller('result-contracts')
export class ResultContractsController {
  constructor(
    private readonly resultContractsService: ResultContractsService,
  ) {}
}
