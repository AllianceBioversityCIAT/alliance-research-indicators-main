import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningDto } from './create-planning.dto';

export class UpdatePlanningDto extends PartialType(CreatePlanningDto) {}
