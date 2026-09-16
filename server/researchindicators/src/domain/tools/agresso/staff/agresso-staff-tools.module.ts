import { Module } from '@nestjs/common';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { HttpModule } from '@nestjs/axios';
import { SecUserReconcilerRepository } from './sec-user-reconciler.repository';
import { SecUserReconcilerService } from './sec-user-reconciler.service';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { SecUserDeactivationService } from './sec-user-deactivation.service';

@Module({
  controllers: [AgressoStaffToolsController],
  providers: [
    AgressoStaffToolsService,
    SecUserReconcilerRepository,
    SecUserReconcilerService,
    SecUserDeactivationRepository,
    SecUserDeactivationService,
  ],
  exports: [
    AgressoStaffToolsService,
    SecUserReconcilerRepository,
    SecUserReconcilerService,
    SecUserDeactivationRepository,
    SecUserDeactivationService,
  ],
  imports: [HttpModule],
})
export class AgressoStaffModule {}
