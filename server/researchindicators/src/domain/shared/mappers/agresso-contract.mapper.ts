import { AgressoContractCountry } from '../../entities/agresso-contract-countries/entities/agresso-contract-country.entity';
import { AgressoContractRawDto } from '../../entities/agresso-contract/dto/agresso-contract-raw.dto';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { ClarisaSdg } from '../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';
import { isEmpty } from '../utils/object.utils';

export const AgressoContractMapper = (
  data: AgressoContractRawDto,
  sdgsData: ClarisaSdg[],
): AgressoContract => {
  const tempData = data;
  /**
   * This is a temporary solution to remove the countryId and country
   * const tempCountries: string = tempData.countryId;
   */
  delete tempData.countryId;
  delete tempData.country;
  const sdgList = tempData?.sustainableDevelopmentGoals
    ?.split(';')
    ?.map((goal) => goal?.split(':')?.[0]);
  const sdgObjectList = sdgsData.filter((obj) =>
    sdgList?.some((frag) =>
      obj.short_name.toLowerCase().includes(frag.toLowerCase()),
    ),
  );
  delete tempData.sustainableDevelopmentGoals;

  const mapperData: AgressoContract = { ...tempData, sdgs: sdgObjectList };
  return mapperData;
};

export const mapCountries = (
  countries: string,
  contractId: string,
): AgressoContractCountry[] => {
  const countryArray: AgressoContractCountry[] = countries
    ?.split(',')
    .map((country) => {
      const newContry = new AgressoContractCountry();
      newContry.iso_alpha_2 = country.trim().toUpperCase();
      newContry.agreement_id = contractId.trim();
      return newContry;
    })
    .filter((cc) => !isEmpty(cc.iso_alpha_2));
  return countryArray;
};
