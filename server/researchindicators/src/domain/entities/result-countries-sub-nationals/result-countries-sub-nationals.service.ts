import { Injectable } from '@nestjs/common';
import { CreateResultCountriesSubNationalDto } from './dto/create-result-countries-sub-national.dto';
import { UpdateResultCountriesSubNationalDto } from './dto/update-result-countries-sub-national.dto';

@Injectable()
export class ResultCountriesSubNationalsService {
  create(createResultCountriesSubNationalDto: CreateResultCountriesSubNationalDto) {
    return 'This action adds a new resultCountriesSubNational';
  }

  findAll() {
    return `This action returns all resultCountriesSubNationals`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultCountriesSubNational`;
  }

  update(id: number, updateResultCountriesSubNationalDto: UpdateResultCountriesSubNationalDto) {
    return `This action updates a #${id} resultCountriesSubNational`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultCountriesSubNational`;
  }
}
