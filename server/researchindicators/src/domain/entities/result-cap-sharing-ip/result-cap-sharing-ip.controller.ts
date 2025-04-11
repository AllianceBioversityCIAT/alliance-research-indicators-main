import { Controller } from '@nestjs/common';
import { ResultCapSharingIpService } from './result-cap-sharing-ip.service';

@Controller('result-cap-sharing-ip')
export class ResultCapSharingIpController {
  constructor(
    private readonly resultCapSharingIpService: ResultCapSharingIpService,
  ) {}
}
