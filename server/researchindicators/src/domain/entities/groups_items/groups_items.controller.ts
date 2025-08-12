import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { GroupsItemsService } from './groups_items.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { StructureDto } from './dto/group-item-action.dto';

@ApiTags('groups-items')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class GroupsItemsController {
  constructor(private readonly groupsItemsService: GroupsItemsService) {}

  @Get('items-list')
  findAll() {
    return this.groupsItemsService.findAll().then((structure) =>
      ResponseUtils.format({
        description: 'Structure found',
        status: HttpStatus.OK,
        data: structure,
      }),
    );
  }

  @Post('sync')
  async handleAction(@Body() dto: StructureDto) {
    return this.groupsItemsService.syncStructures(dto).then((structure) =>
      ResponseUtils.format({
        description: 'Structure found',
        status: HttpStatus.OK,
        data: structure,
      }),
    );
  }
}
