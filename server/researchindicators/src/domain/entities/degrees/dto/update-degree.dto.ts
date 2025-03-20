import { PartialType } from '@nestjs/swagger';
import { CreateDegreeDto } from './create-degree.dto';

export class UpdateDegreeDto extends PartialType(CreateDegreeDto) {}
