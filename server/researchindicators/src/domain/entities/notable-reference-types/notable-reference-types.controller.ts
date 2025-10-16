import { Controller } from '@nestjs/common';
import { NotableReferenceTypesService } from './notable-reference-types.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Notable Reference Types')
@Controller()
@ApiBearerAuth()
export class NotableReferenceTypesController extends BaseController<NotableReferenceTypesService> {
  constructor(service: NotableReferenceTypesService) {
    super(service, 'NotableReferenceType');
  }
}
