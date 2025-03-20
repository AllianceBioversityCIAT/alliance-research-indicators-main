import { FindAllOptions } from '../../../shared/enum/find-all-options';

export interface ElasticFindEntity<EntityDto> {
  findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<EntityDto[]>;
}
