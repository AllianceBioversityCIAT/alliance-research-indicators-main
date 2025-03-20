export enum IndicatorsEnum {
  CAPACITY_SHARING_FOR_DEVELOPMENT = 1,
  INNOVATION_DEV = 2,
  KNOWLEDGE_PRODUCT = 3,
  POLICY_CHANGE = 4,
  OICR = 5,
  INNOVATION_USE = 6,
}

export enum QueryIndicatorsEnum {
  CAPACITY_SHARING_FOR_DEVELOPMENT = 'capacity-sharing-for-development',
  INNOVATION_DEV = 'innovation-dev',
  KNOWLEDGE_PRODUCT = 'knowledge-product',
  POLICY_CHANGE = 'policy-change',
  OICR = 'oicr',
  INNOVATION_USE = 'innovation-use',
}

export class QueryIndicators {
  public static readonly capacity_sharing_for_development = new QueryIndicators(
    QueryIndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  );

  public static readonly innovation_dev = new QueryIndicators(
    QueryIndicatorsEnum.INNOVATION_DEV,
    IndicatorsEnum.INNOVATION_DEV,
  );

  public static readonly innovation_use = new QueryIndicators(
    QueryIndicatorsEnum.INNOVATION_USE,
    IndicatorsEnum.INNOVATION_USE,
  );

  public static readonly knowledge_product = new QueryIndicators(
    QueryIndicatorsEnum.KNOWLEDGE_PRODUCT,
    IndicatorsEnum.KNOWLEDGE_PRODUCT,
  );

  public static readonly oicr = new QueryIndicators(
    QueryIndicatorsEnum.OICR,
    IndicatorsEnum.OICR,
  );

  public static readonly policyChange = new QueryIndicators(
    QueryIndicatorsEnum.POLICY_CHANGE,
    IndicatorsEnum.POLICY_CHANGE,
  );

  constructor(
    public name: QueryIndicatorsEnum,
    public value: IndicatorsEnum,
  ) {}

  public static getFromName(
    name: QueryIndicatorsEnum,
  ): QueryIndicators | undefined {
    return (Object.values(this) as QueryIndicators[]).find(
      (n) => n.name === name,
    );
  }

  public static getFromValue(
    value: IndicatorsEnum,
  ): QueryIndicators | undefined {
    return (Object.values(this) as QueryIndicators[]).find(
      (n) => n.value === value,
    );
  }
}
