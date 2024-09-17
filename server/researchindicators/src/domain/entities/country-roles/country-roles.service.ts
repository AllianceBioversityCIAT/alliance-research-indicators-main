import { Injectable } from '@nestjs/common';
import { CreateCountryRoleDto } from './dto/create-country-role.dto';
import { UpdateCountryRoleDto } from './dto/update-country-role.dto';

@Injectable()
export class CountryRolesService {
  create(createCountryRoleDto: CreateCountryRoleDto) {
    return 'This action adds a new countryRole';
  }

  findAll() {
    return `This action returns all countryRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} countryRole`;
  }

  update(id: number, updateCountryRoleDto: UpdateCountryRoleDto) {
    return `This action updates a #${id} countryRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} countryRole`;
  }
}
