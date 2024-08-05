import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { CreateAgressoContractDto } from './dto/create-agresso-contract.dto';
import { UpdateAgressoContractDto } from './dto/update-agresso-contract.dto';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import { ApiProperty, ApiQuery } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@Controller('agresso-contract')
export class AgressoContractController {
  constructor(
    private readonly agressoContractService: AgressoContractService,
  ) {}

  @Get('upload-dummy-data')
  uploadDummyData() {
    this.agressoContractService.uploadAgressoContracts();
    return ResponseUtils.format({
      description: 'The data is being uploaded',
      status: HttpStatus.OK,
    });
  }

  @Get('contracts')
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'funding_type', required: false })
  @ApiQuery({ name: 'contract_status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'show_countries', required: false })
  find(
    @Query('project') project: string,
    @Query('funding_type') fundingType: string,
    @Query('contract_status') contractStatus: AgressoContractStatus,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('show_countries') showCountries: string,
  ) {
    return this.agressoContractService.findContracts(
      {
        agreement_id: project,
        funding_type: fundingType,
        contract_status: contractStatus,
      },
      {
        limit: +limit,
        page: +page,
      },
      {
        countries: showCountries,
      },
    );
  }
}
