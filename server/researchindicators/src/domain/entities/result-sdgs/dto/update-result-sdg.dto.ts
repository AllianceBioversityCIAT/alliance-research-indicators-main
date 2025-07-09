import { PartialType } from '@nestjs/swagger';
import { CreateResultSdgDto } from './create-result-sdg.dto';

export class UpdateResultSdgDto extends PartialType(CreateResultSdgDto) {}
