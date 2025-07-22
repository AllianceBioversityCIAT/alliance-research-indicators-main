import { Module } from '@nestjs/common';
import { IssueCategoriesService } from './issue-categories.service';
import { IssueCategoriesController } from './issue-categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueCategory } from './entities/issue-category.entity';

@Module({
  controllers: [IssueCategoriesController],
  imports: [TypeOrmModule.forFeature([IssueCategory])],
  providers: [IssueCategoriesService],
  exports: [IssueCategoriesService],
})
export class IssueCategoriesModule {}
