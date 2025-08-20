import { Controller } from '@nestjs/common';
import { TagsService } from './tags.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Tags')
@Controller()
@ApiBearerAuth()
export class TagsController extends BaseController<TagsService> {
  constructor(service: TagsService) {
    super(service, 'Tag');
  }
}
