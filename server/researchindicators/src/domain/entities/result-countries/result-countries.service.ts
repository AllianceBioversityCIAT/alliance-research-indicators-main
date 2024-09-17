import { Injectable } from '@nestjs/common';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { UpdateResultCountryDto } from './dto/update-result-country.dto';

@Injectable()
export class ResultCountriesService {
  create(createResultCountryDto: CreateResultCountryDto) {
    return 'This action adds a new resultCountry';
  }

  findAll() {
    return `This action returns all resultCountries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultCountry`;
  }

  update(id: number, updateResultCountryDto: UpdateResultCountryDto) {
    return `This action updates a #${id} resultCountry`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultCountry`;
  }
}
