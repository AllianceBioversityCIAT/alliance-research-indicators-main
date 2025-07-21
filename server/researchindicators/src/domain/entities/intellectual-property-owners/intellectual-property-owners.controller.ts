import { Controller, Get, HttpStatus } from '@nestjs/common';
import { IntellectualPropertyOwnersService } from './intellectual-property-owners.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { mapperIntellectualPropertyOwner } from './mappers/intellectual-property-owner.mapper';

@ApiTags('Intellectual Property Rights')
@Controller()
@ApiBearerAuth()
export class IntellectualPropertyOwnersController {
  constructor(
    private readonly intellectualPropertyOwnersService: IntellectualPropertyOwnersService,
  ) {}

  @Get()
  findAll() {
    return this.intellectualPropertyOwnersService.findAll().then((result) => {
      return ResponseUtils.format({
        description: 'Intellectual property owners found',
        status: HttpStatus.OK,
        data: result.map(mapperIntellectualPropertyOwner),
      });
    });
  }
}
