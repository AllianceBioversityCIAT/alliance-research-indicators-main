import { Module } from '@nestjs/common';
import { LinkResultsService } from './link-results.service';
import { LinkResultsController } from './link-results.controller';

@Module({
  controllers: [LinkResultsController],
  providers: [LinkResultsService],
})
export class LinkResultsModule {}
