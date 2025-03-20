import { Module } from '@nestjs/common';
import { AgressoToolsService } from './agresso-tools.service';
import { AgressoToolsController } from './agresso-tools.controller';
import { AgressoStaffModule } from './staff/agresso-staff-tools.module';

@Module({
  controllers: [AgressoToolsController],
  providers: [AgressoToolsService],
  imports: [AgressoStaffModule],
  exports: [AgressoToolsService],
})
export class AgressoToolsModule {}
