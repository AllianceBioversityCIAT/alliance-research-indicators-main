import { Module } from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { GreenChecksController } from './green-checks.controller';
import { GreenCheckRepository } from './repository/green-checks.repository';

@Module({
  controllers: [GreenChecksController],
  providers: [GreenChecksService, GreenCheckRepository],
  exports: [GreenChecksService, GreenCheckRepository],
})
export class GreenChecksModule {}
