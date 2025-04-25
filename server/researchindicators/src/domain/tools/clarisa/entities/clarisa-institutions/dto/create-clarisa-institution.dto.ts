export class CreateClarisaInstitutionDto {
  public code: number;
  public name: string;
  public acronym: string;
  public websiteLink: string;
  public added: Date;
  public countryOfficeDTO: CountryOfficeDTO[];
  public institutionType: {
    code: number;
    name: string;
  };
}

export class CountryOfficeDTO {
  public code: number;
  public name: string;
  public isoAlpha2: string;
  public regionDTO: any;
  public isHeadquarter: number;
}
