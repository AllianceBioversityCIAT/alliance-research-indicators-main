import { PartialType } from '@nestjs/swagger';
import { CreateResultRegionDto } from './create-result-region.dto';

export class UpdateResultRegionDto extends PartialType(CreateResultRegionDto) {}
