import { PartialType } from '@nestjs/mapped-types';
import { CreateIndicatorPerItemDto } from './create-indicator_per_item.dto';

export class UpdateIndicatorPerItemDto extends PartialType(CreateIndicatorPerItemDto) {}
