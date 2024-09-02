import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';
import { UserService } from '../../complementary-entities/secondary/user/user.service';

@Module({
  controllers: [ResultsController],
  providers: [ResultsService, ResultRepository, UserService],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}
