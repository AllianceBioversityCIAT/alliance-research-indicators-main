import { HttpStatus, Param, Get } from '@nestjs/common';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ControlListBaseService } from './clarisa-base-service';

export abstract class BaseController<
  Service extends ControlListBaseService<any, any>,
> {
  constructor(
    protected service: Service,
    protected dataName: string,
  ) {}

  @Get()
  async find() {
    return this.service.findAll().then((data) =>
      ResponseUtils.format({
        description: `${this.dataName} found`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id(\\d+)')
  async findById(@Param('id') id: string) {
    return this.service.findOne(+id).then((data) =>
      ResponseUtils.format({
        description: `${this.dataName} found`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }
}
