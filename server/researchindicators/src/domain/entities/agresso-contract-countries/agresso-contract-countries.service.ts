import { Injectable } from '@nestjs/common';
import { CreateAgressoContractCountryDto } from './dto/create-agresso-contract-country.dto';
import { UpdateAgressoContractCountryDto } from './dto/update-agresso-contract-country.dto';

@Injectable()
export class AgressoContractCountriesService {
  create(createAgressoContractCountryDto: CreateAgressoContractCountryDto) {
    return 'This action adds a new agressoContractCountry';
  }

  findAll() {
    return `This action returns all agressoContractCountries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} agressoContractCountry`;
  }

  update(id: number, updateAgressoContractCountryDto: UpdateAgressoContractCountryDto) {
    return `This action updates a #${id} agressoContractCountry`;
  }

  remove(id: number) {
    return `This action removes a #${id} agressoContractCountry`;
  }
}
