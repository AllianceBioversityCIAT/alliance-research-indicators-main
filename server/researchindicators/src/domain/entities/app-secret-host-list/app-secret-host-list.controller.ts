import { Controller } from '@nestjs/common';
import { AppSecretHostListService } from './app-secret-host-list.service';

@Controller('app-secret-host-list')
export class AppSecretHostListController {
  constructor(
    private readonly appSecretHostListService: AppSecretHostListService,
  ) {}
}
