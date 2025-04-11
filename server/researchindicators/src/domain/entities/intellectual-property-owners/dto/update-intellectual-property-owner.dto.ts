import { PartialType } from '@nestjs/swagger';
import { CreateIntellectualPropertyOwnerDto } from './create-intellectual-property-owner.dto';

export class UpdateIntellectualPropertyOwnerDto extends PartialType(CreateIntellectualPropertyOwnerDto) {}
