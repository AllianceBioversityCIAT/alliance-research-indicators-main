import { Module } from '@nestjs/common';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { HttpModule } from '@nestjs/axios';
import { SecUserReconcilerRepository } from './sec-user-reconciler.repository';
import { SecUserReconcilerService } from './sec-user-reconciler.service';

@Module({
  controllers: [AgressoStaffToolsController],
  providers: [
    AgressoStaffToolsService,
    SecUserReconcilerRepository,
    SecUserReconcilerService,
  ],
  exports: [
    AgressoStaffToolsService,
    SecUserReconcilerRepository,
    SecUserReconcilerService,
  ],
  imports: [HttpModule],
})
export class AgressoStaffModule {}
