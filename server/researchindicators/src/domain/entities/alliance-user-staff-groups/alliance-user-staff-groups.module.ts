import { Module } from '@nestjs/common';
import { AllianceUserStaffGroupsService } from './alliance-user-staff-groups.service';
import { AllianceUserStaffGroupsController } from './alliance-user-staff-groups.controller';

@Module({
  controllers: [AllianceUserStaffGroupsController],
  providers: [AllianceUserStaffGroupsService],
  exports: [AllianceUserStaffGroupsService],
})
export class AllianceUserStaffGroupsModule {}
