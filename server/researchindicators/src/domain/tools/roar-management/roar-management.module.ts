import { Module } from '@nestjs/common';
import { RoarManagementService } from './roar-management.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [RoarManagementService],
  imports: [HttpModule],
  exports: [RoarManagementService],
})
export class RoarManagementModule {}
