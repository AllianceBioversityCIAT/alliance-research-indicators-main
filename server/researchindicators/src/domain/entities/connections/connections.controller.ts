import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ConnectionService } from './connections.service';
import { MisSimpleInfoDto } from '../../tools/clarisa/dto/clarisa.types';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Connections')
@ApiBearerAuth()
@Controller()
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post('create')
  @ApiBody({
    type: MisSimpleInfoDto,
    description:
      'Create and generate credentials for a new connection to ROAR Main',
  })
  async createConnection(@Body() body: MisSimpleInfoDto) {
    return this.connectionService.createConnection(body).then((response) =>
      ResponseUtils.format({
        description: 'Connection created',
        data: response,
        status: HttpStatus.OK,
      }),
    );
  }
}
