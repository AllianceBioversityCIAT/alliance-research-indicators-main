import { Injectable } from '@nestjs/common';
import { CreateClarisaCountryDto } from './dto/create-clarisa-country.dto';
import { UpdateClarisaCountryDto } from './dto/update-clarisa-country.dto';

@Injectable()
export class ClarisaCountriesService {
  create(createClarisaCountryDto: CreateClarisaCountryDto) {
    return 'This action adds a new clarisaCountry';
  }

  findAll() {
    return `This action returns all clarisaCountries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaCountry`;
  }

  update(id: number, updateClarisaCountryDto: UpdateClarisaCountryDto) {
    return `This action updates a #${id} clarisaCountry`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCountry`;
  }
}
