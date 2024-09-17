import { PartialType } from '@nestjs/swagger';
import { CreateResultLeverDto } from './create-result-lever.dto';

export class UpdateResultLeverDto extends PartialType(CreateResultLeverDto) {}
