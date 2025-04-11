import { Controller, Get } from '@nestjs/common';
import { IntellectualPropertyOwnersService } from './intellectual-property-owners.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Result Capacity Sharing')
@Controller()
@ApiBearerAuth()
export class IntellectualPropertyOwnersController {
  constructor(
    private readonly intellectualPropertyOwnersService: IntellectualPropertyOwnersService,
  ) {}

  @Get()
  findAll() {
    return this.intellectualPropertyOwnersService.findAll();
  }
}
