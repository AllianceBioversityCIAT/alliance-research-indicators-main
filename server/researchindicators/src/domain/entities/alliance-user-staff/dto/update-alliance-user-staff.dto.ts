import { PartialType } from '@nestjs/swagger';
import { CreateAllianceUserStaffDto } from './create-alliance-user-staff.dto';

export class UpdateAllianceUserStaffDto extends PartialType(
  CreateAllianceUserStaffDto,
) {}
