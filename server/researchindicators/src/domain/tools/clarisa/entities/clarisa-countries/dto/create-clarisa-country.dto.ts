export class CreateClarisaCountryDto {
  public code: number;
  public isoAlpha2: string;
  public isoAlpha3: string;
  public name: string;
  public regionDTO: {
    name: string;
    um49Code: number;
    parentRegion: {
      name: string;
      um49Code: number;
    };
  };
  public locationDTO: {
    latitude: number;
    longitude: number;
  };
}
