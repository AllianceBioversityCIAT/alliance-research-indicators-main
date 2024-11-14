import { Controller } from '@nestjs/common';
import { AllianceUserStaffService } from './alliance-user-staff.service';

@Controller('alliance-user-staff')
export class AllianceUserStaffController {
  constructor(
    private readonly allianceUserStaffService: AllianceUserStaffService,
  ) {}
}
