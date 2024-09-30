export class CreateClarisaInstitutionDto {
  public code: number;
  public name: string;
  public acronym: string;
  public websiteLink: string;
  public added: Date;
  public countryOfficeDTO: {
    code: number;
    name: string;
    isoAlpha2: string;
    regionDTO: any;
    isHeadquarter: number;
  }[];
  public institutionType: {
    code: number;
    name: string;
  };
}
