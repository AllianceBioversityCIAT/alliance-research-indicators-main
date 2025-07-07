import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueCategory } from './entities/issue-category.entity';

@Injectable()
export class IssueCategoriesService {
  constructor(
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
  ) {}

  async find(): Promise<{ id: number; name: string }[]> {
    const categories = await this.issueCategoryRepository.find({
      select: ['issue_category_id', 'name'],
      where: { is_active: true },
    });

    return categories.map((c) => ({
      id: c.issue_category_id,
      name: c.name,
    }));
  }

}
