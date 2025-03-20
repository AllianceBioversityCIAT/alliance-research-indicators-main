export class FindGreenChecksDto {
  public general_information: boolean;
  public alignment: boolean;
  public geo_location: boolean;
  public partners: boolean;
  public evidences: boolean;
  public cap_sharing?: boolean;
  public policy_change?: boolean;
  public completness?: boolean;
}
