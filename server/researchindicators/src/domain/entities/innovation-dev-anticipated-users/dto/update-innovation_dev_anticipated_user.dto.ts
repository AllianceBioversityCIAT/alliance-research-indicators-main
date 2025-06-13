import { PartialType } from '@nestjs/swagger';
import { CreateInnovationDevAnticipatedUserDto } from './create-innovation_dev_anticipated_user.dto';

export class UpdateInnovationDevAnticipatedUserDto extends PartialType(
  CreateInnovationDevAnticipatedUserDto,
) {}
