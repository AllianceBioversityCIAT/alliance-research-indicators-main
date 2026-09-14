import { Module } from '@nestjs/common';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { HttpModule } from '@nestjs/axios';
import { SecUserReconcilerRepository } from './sec-user-reconciler.repository';

@Module({
  controllers: [AgressoStaffToolsController],
  providers: [AgressoStaffToolsService, SecUserReconcilerRepository],
  exports: [AgressoStaffToolsService, SecUserReconcilerRepository],
  imports: [HttpModule],
})
export class AgressoStaffModule {}
