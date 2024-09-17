import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryModalityDto } from './create-delivery-modality.dto';

export class UpdateDeliveryModalityDto extends PartialType(CreateDeliveryModalityDto) {}
