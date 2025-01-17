export class ElasticOperationDto<T> {
  constructor(
    public operation: 'DELETE' | 'PATCH',
    public data: T,
  ) {}
}
