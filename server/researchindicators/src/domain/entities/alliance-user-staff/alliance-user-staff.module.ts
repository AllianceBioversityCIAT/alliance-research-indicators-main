import { Module } from '@nestjs/common';
import { AllianceUserStaffService } from './alliance-user-staff.service';
import { AllianceUserStaffController } from './alliance-user-staff.controller';

@Module({
  controllers: [AllianceUserStaffController],
  providers: [AllianceUserStaffService],
})
export class AllianceUserStaffModule {}
