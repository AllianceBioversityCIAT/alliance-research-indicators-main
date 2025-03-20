export class ElasticOperationDto<T> {
  constructor(
    public operation: ElasticOperationEnum,
    public data: Partial<T>,
  ) {}
}

export enum ElasticOperationEnum {
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  PUT = 'PUT',
}
