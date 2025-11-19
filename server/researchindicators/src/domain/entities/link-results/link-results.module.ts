import { forwardRef, Module } from '@nestjs/common';
import { LinkResultsService } from './link-results.service';
import { LinkResultsController } from './link-results.controller';
import { ResultsModule } from '../results/results.module';

@Module({
  controllers: [LinkResultsController],
  providers: [LinkResultsService],
  exports: [LinkResultsService],
  imports: [forwardRef(() => ResultsModule)],
})
export class LinkResultsModule {}
