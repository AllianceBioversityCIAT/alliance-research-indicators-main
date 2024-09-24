import { Controller } from '@nestjs/common';
import { CountryRolesService } from './country-roles.service';

@Controller('country-roles')
export class CountryRolesController {
  constructor(private readonly countryRolesService: CountryRolesService) {}
}
