import { PartialType } from '@nestjs/swagger';
import { CreateResultCapSharingIpDto } from './create-result-cap-sharing-ip.dto';

export class UpdateResultCapSharingIpDto extends PartialType(CreateResultCapSharingIpDto) {}
