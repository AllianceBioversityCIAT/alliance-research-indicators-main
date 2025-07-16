import { PartialType } from '@nestjs/swagger';
import { CreateDisseminationQualificationDto } from './create-dissemination-qualification.dto';

export class UpdateDisseminationQualificationDto extends PartialType(
  CreateDisseminationQualificationDto,
) {}
