import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectGroupDto } from './create-project_group.dto';

export class UpdateProjectGroupDto extends PartialType(CreateProjectGroupDto) {}
