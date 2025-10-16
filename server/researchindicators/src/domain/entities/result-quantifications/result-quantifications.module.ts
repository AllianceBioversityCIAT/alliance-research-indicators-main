import { Module } from '@nestjs/common';
import { ResultQuantificationsService } from './result-quantifications.service';
import { ResultQuantificationsController } from './result-quantifications.controller';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Module({
  controllers: [ResultQuantificationsController],
  providers: [ResultQuantificationsService, CurrentUserUtil],
  exports: [ResultQuantificationsService],
})
export class ResultQuantificationsModule {}
