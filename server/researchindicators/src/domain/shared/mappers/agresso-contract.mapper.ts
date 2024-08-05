import { AgressoContractCountry } from '../../entities/agresso-contract-countries/entities/agresso-contract-country.entity';
import { AgressoContractRawDto } from '../../entities/agresso-contract/dto/agresso-contract-raw.dto';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';

export const AgressoContractMapper = (
  data: AgressoContractRawDto,
): AgressoContract => {
  const tempData = data;
  const tempCountries: string = tempData.countryId;
  delete tempData.countryId;
  delete tempData.country;

  const mapperData: AgressoContract = {
    ...tempData,
    countries: mapCountries(tempCountries),
  };
  return mapperData;
};

const mapCountries = (countries: string): AgressoContractCountry[] => {
  const countryArray: AgressoContractCountry[] = countries
    .split(',')
    .map((country) => {
      const newContry = new AgressoContractCountry();
      newContry.iso_alpha_2 = country.trim();
      return newContry;
    });
  return countryArray;
};
