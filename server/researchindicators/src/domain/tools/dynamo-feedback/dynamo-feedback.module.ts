import { Module } from '@nestjs/common';
import { DynamoFeedbackService } from './dynamo-feedback.service';
import { DynamoFeedbackController } from './dynamo-feedback.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueCategory } from '../../entities/issue-categories/entities/issue-category.entity';

@Module({
  controllers: [DynamoFeedbackController],
  providers: [DynamoFeedbackService],
  exports: [DynamoFeedbackService],
  imports: [TypeOrmModule.forFeature([IssueCategory])],
})
export class DynamoFeedbackModule {}
