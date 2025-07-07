import { PartialType } from '@nestjs/mapped-types';
import { CreateIssueCategoryDto } from './create-issue-category.dto';

export class UpdateIssueCategoryDto extends PartialType(CreateIssueCategoryDto) {}
