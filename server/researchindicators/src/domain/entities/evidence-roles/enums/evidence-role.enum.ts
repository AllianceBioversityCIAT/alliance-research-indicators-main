export enum EvidenceRoleEnum {
  PRINCIPAL_EVIDENCE = 1,
}

export enum QueryEvidenceRolesEnum {
  PRINCIPAL_EVIDENCE = 'principal-evidence',
}

export class QueryEvidenceRoles {
  public static readonly principalEvidence = new QueryEvidenceRoles(
    QueryEvidenceRolesEnum.PRINCIPAL_EVIDENCE,
    EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
  );

  constructor(
    public name: QueryEvidenceRolesEnum,
    public value: EvidenceRoleEnum,
  ) {}

  public static getFromName(
    name: QueryEvidenceRolesEnum,
  ): QueryEvidenceRoles | undefined {
    return (Object.values(this) as QueryEvidenceRoles[]).find(
      (n) => n.name === name,
    );
  }

  public static getFromValue(
    value: EvidenceRoleEnum,
  ): QueryEvidenceRoles | undefined {
    return (Object.values(this) as QueryEvidenceRoles[]).find(
      (n) => n.value === value,
    );
  }
}
