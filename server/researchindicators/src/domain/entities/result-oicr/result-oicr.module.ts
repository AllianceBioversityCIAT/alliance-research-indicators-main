import { forwardRef, Module } from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { ResultOicrController } from './result-oicr.controller';
import { ResultTagsModule } from '../result-tags/result-tags.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultInitiativesModule } from '../result-initiatives/result-initiatives.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ResultsModule } from '../results/results.module';

@Module({
  controllers: [ResultOicrController],
  providers: [ResultOicrService],
  imports: [
    ResultTagsModule,
    ResultUsersModule,
    LinkResultsModule,
    ResultInitiativesModule,
    ResultLeversModule,
    forwardRef(() => ResultsModule),
  ],
  exports: [ResultOicrService],
})
export class ResultOicrModule {}
