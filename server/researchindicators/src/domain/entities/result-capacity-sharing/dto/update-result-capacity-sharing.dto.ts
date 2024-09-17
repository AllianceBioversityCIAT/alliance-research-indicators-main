import { PartialType } from '@nestjs/swagger';
import { CreateResultCapacitySharingDto } from './create-result-capacity-sharing.dto';

export class UpdateResultCapacitySharingDto extends PartialType(CreateResultCapacitySharingDto) {}
