import { Module } from '@nestjs/common';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [AgressoStaffToolsController],
  providers: [AgressoStaffToolsService],
  exports: [AgressoStaffToolsService],
  imports: [HttpModule],
})
export class AgressoStaffModule {}
