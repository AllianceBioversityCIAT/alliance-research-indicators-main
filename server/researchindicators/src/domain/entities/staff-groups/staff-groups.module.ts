import { Module } from '@nestjs/common';
import { StaffGroupsService } from './staff-groups.service';
import { StaffGroupsController } from './staff-groups.controller';

@Module({
  controllers: [StaffGroupsController],
  providers: [StaffGroupsService],
})
export class StaffGroupsModule {}
