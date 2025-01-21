import { AxiosRequestConfig, isAxiosError } from 'axios';
import { BaseApi } from '../../core/base-api';
import { HttpService } from '@nestjs/axios';
import {
  ElasticQueryDto,
  OpenSearchOperator,
  OpenSearchQuery,
  OpenSearchTerms,
  OpenSearchWildcard,
  TypeSort,
} from '../dto/elastic-query.dto';
import { Repository } from 'typeorm';
import { ElasticResponse } from '../dto/elastic-response.dto';
import { forkJoin, lastValueFrom } from 'rxjs';
import { ElasticFindEntity } from '../dto/elastic-find-entity.dto';
import { ElasticOperationDto } from '../dto/elastic-operation.dto';
import { OpenSearchMetadataName } from '../decorators/opensearch-property.decorator';
import { SchemaOpenSearch } from '../dto/opensearch-schema';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { isArrayOfType } from '../../../shared/utils/array.util';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  PropertyDescriptor,
  SearchFields,
} from './types/base-open-search.types';

export abstract class BaseOpenSearchApi<
  Entity,
  OpenSearchEntity,
  Repo extends Repository<Entity> & ElasticFindEntity<OpenSearchEntity>,
> extends BaseApi {
  protected readonly OPENSEARCH_MAX_UPLOAD_SIZE = 1024 * 1024;
  protected readonly _bulkElasticUrl = `_bulk`;
  protected readonly _primaryKey: keyof Entity;
  protected readonly _index: string;
  protected _config: AxiosRequestConfig;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly _mainRepo: Repo,
    protected readonly _appConfig: AppConfig,
    customPrimaryKey?: string,
    private readonly _openSearchEntity?: new () => OpenSearchEntity,
  ) {
    super(
      httpService,
      _appConfig.OPEN_SEARCH_URL,
      BaseOpenSearchApi.name,
      _appConfig.OPEN_SEARCH_USER,
      _appConfig.OPEN_SEARCH_PASS,
    );
    this._config = <Readonly<AxiosRequestConfig>>{
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${_appConfig.OPEN_SEARCH_USER}:${_appConfig.OPEN_SEARCH_PASS}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-ndjson',
      },
    };
    if (customPrimaryKey) {
      this._primaryKey = customPrimaryKey as keyof Entity;
    } else {
      this._primaryKey = this._mainRepo.metadata.primaryColumns[0]
        .propertyName as keyof Entity;
    }
    this._index = `${this._appConfig.OPEN_SEARCH_BASE_INDEX}_${this._mainRepo.metadata.tableName}`;
  }

  get tableName(): string {
    return this._mainRepo.metadata.tableName.replace(/_/g, ' ');
  }

  async uploadSingleToOpenSearch(
    data: number | OpenSearchEntity,
  ): Promise<void> {
    const isId = typeof data === 'number';
    const promise = isId
      ? this.findForOpenSearch(this._index, [data])
      : Promise.resolve([
          this.getSingleElasticOperation(
            this._index,
            new ElasticOperationDto('PATCH', data),
            true,
          ),
        ]);

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(
          `${this.tableName} with id ${isId ? data : data[this._primaryKey as string]} has been uploaded to OpenSearch`,
        );
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async uploadToOpenSearch(data: number[] | OpenSearchEntity[]): Promise<void> {
    const isNumericArray = isArrayOfType<number>(
      data,
      (e) => typeof e === 'number',
    );
    const promise = isNumericArray
      ? this.findForOpenSearch(this._index, data)
      : Promise.resolve(
          this.getBulkElasticOperation(
            this._index,
            data.map((i) => new ElasticOperationDto('PATCH', i)),
          ),
        );

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(
          `The ${this.tableName} have been uploaded to OpenSearch`,
        );
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  /**
   * Sends bulk operations request to OpenSearch.
   *
   * This function performs the following steps:
   * 1. Converts the provided data into a format suitable for a bulk operation in OpenSearch.
   * 2. Sends the bulk operation request to the OpenSearch server.
   *
   * @param {string[]} bulkOperationsJson - An array of JSON strings representing the bulk operations to be performed.
   * @returns {Promise<any>} A promise that resolves with the response from the OpenSearch server.
   */
  public async sendBulkOperationToOpenSearch(
    bulkOperationsJson: string[],
  ): Promise<any> {
    const allRequests = bulkOperationsJson.map((op) =>
      this.postRequest(this._bulkElasticUrl, op, this._config),
    );

    return lastValueFrom(forkJoin(allRequests));
  }

  public getSingleElasticOperation(
    documentName: string,
    operation: ElasticOperationDto<OpenSearchEntity>,
    fromBulk = false,
  ): string {
    const isPatch: boolean = operation.operation === 'PATCH';

    let elasticOperation = `{ "${
      isPatch ? 'index' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${
      operation.data[this._primaryKey as string]
    }"  } }\n${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
  }

  /**
   * Resets the data in the OpenSearch index specified by `env.OPENSEARCH_DOCUMENT_NAME`.
   *
   * This function performs the following steps:
   * 1. Fetches all data from the system.
   * 2. Deletes the existing OpenSearch index.
   * 3. Recreates the index.
   * 4. Sends the previously retrieved data back to the newly created index.
   *
   * @returns {Promise<void>} A promise that resolves when the reset operation is complete.
   */
  async resetElasticData(): Promise<string | void> {
    const now = new Date();
    const opensearchSchema =
      this._openSearchEntity != undefined ? this._getMappingForSchema() : null;
    return this.findForOpenSearch(this._index)
      .then((elasticData) =>
        lastValueFrom(this.deleteRequest(`${this._index}`, this._config)).then(
          () => elasticData,
        ),
      )
      .then((elasticData) =>
        lastValueFrom(
          this.putRequest(`${this._index}`, opensearchSchema, this._config),
        ).then(() => elasticData),
      )
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(
        () =>
          `The data has been reset. Took ${new Date().getTime() - now.getTime()} ms`,
      )
      .catch((error) => {
        this.logger.error(error);
      });
  }

  public getBulkElasticOperation(
    documentName: string,
    operations: ElasticOperationDto<OpenSearchEntity>[],
  ): string[] {
    const bulkElasticOperations = [];
    let currentBatchElasticOperations = '';
    let currentBatchElasticOperationSize = 0;
    const encoder = new TextEncoder();

    for (const [index, currentOperation] of operations.entries()) {
      const elasticOperation = this.getSingleElasticOperation(
        documentName,
        currentOperation,
        true,
      );

      /*
        we need to encode the operation string to get the accurrate
        byte size, as a simple string length will not work for
        multi-byte characters like emojis or special characters
        in other languages
      */
      const currentEncodedOperation = encoder.encode(elasticOperation);

      /*
        we will cut off the batch if we are at the last operation,
        or if the current operation is going to make the current batch
        larger than the max upload size
        (the +1 is an additional byte for the newline character,
        required by elastic search when bulk uploading)
       */
      if (
        currentBatchElasticOperationSize + currentEncodedOperation.length + 1 >
          this.OPENSEARCH_MAX_UPLOAD_SIZE ||
        (index === operations.length - 1 && currentBatchElasticOperations)
      ) {
        currentBatchElasticOperations =
          currentBatchElasticOperations.concat('\n');
        bulkElasticOperations.push(currentBatchElasticOperations);
        currentBatchElasticOperations = '';
        currentBatchElasticOperationSize = 0;
      }

      currentBatchElasticOperations += elasticOperation;
      currentBatchElasticOperationSize += currentEncodedOperation.length;
    }

    currentBatchElasticOperations = currentBatchElasticOperations.concat('\n');
    bulkElasticOperations.push(currentBatchElasticOperations);

    return bulkElasticOperations;
  }

  /**
   * Retrieves data from the repository and formats it for OpenSearch.
   *
   * This function performs the following steps:
   * 1. Queries the repository for based on the provided options.
   * 2. Throws an error if no data is found.
   * 3. Maps the query results to an array of ElasticOperationDto objects.
   * 4. Converts the array of ElasticOperationDto objects to a bulk OpenSearch operation JSON format.
   *
   * @param {string} documentName - The name of the OpenSearch document.
   * @param {number} [ids] - An optional ID array to filter the data.
   * @returns {Promise<string[]>} A promise that resolves to an array of JSON strings representing the bulk OpenSearch operations.
   * @throws {Error} If no data is found in the repository.
   */
  async findForOpenSearch(
    documentName: string,
    ids?: number[],
  ): Promise<string[]> {
    return this._mainRepo
      .findDataForOpenSearch(FindAllOptions.SHOW_ALL, ids)
      .then((queryResult) => {
        if (!queryResult.length) {
          throw new Error('No data found');
        }

        const operations: ElasticOperationDto<OpenSearchEntity>[] =
          queryResult.map((r) => new ElasticOperationDto('PATCH', r));

        const elasticJson: string[] = this.getBulkElasticOperation(
          documentName,
          operations,
        );

        return elasticJson;
      });
  }

  private _getMappingForSchema() {
    const properties: PropertyDescriptor[] =
      Reflect.getMetadata(OpenSearchMetadataName, this._openSearchEntity) || [];
    const schema: SchemaOpenSearch<OpenSearchEntity> = {
      mappings: {
        dynamic: true,
        properties: {},
      },
    };

    for (const { propertyKey, options } of properties) {
      const propertyType: any = {};
      if (options?.type) {
        propertyType.type = options.type;
        if (options.nestedType) {
          propertyType['properties'] = this._iterateProperties(
            options.nestedType,
          );
        }
        schema.mappings.properties[propertyKey] = propertyType;
      }

      if (options?.fielddata !== undefined) {
        propertyType.fielddata = options.fielddata;
      }
    }

    return schema;
  }

  private _iterateProperties(opensearchObject?: new () => unknown) {
    const properties: PropertyDescriptor[] =
      Reflect.getMetadata(OpenSearchMetadataName, opensearchObject) || [];
    const schema = {};
    for (const { propertyKey, options } of properties) {
      if (options?.type) {
        const propertyType = {
          type: options.type,
        };
        if (
          options.nestedType &&
          opensearchObject.name !== options.nestedType.name
        ) {
          propertyType['properties'] = this._iterateProperties(
            options.nestedType,
          );
        }
        schema[propertyKey] = propertyType;
      }
    }
    return schema;
  }

  async search(
    query: string,
    fieldsToSearchOn: SearchFields<OpenSearchEntity>,
    fieldsToSortOn: TypeSort<OpenSearchEntity>[],
    size: number = 20,
    filter?: string,
    fieldToFilterOn?: keyof OpenSearchEntity,
  ): Promise<(OpenSearchEntity & { score: number })[]> {
    const listOfFieldsToSearch = this._getDeepKeys(fieldsToSearchOn);
    const elasticQuery = this._getElasticQuery<OpenSearchEntity>(
      query,
      size,
      listOfFieldsToSearch,
      fieldsToSortOn,
      filter,
      fieldToFilterOn,
    );

    console.log(JSON.stringify(elasticQuery));
    return lastValueFrom(
      this.postRequest<
        ElasticQueryDto<OpenSearchEntity>,
        ElasticResponse<OpenSearchEntity>
      >(`${this._index}/_search`, elasticQuery, this._config),
    )
      .then((response) => {
        return response.data?.hits?.hits?.map((hit) => ({
          ...hit._source,
          score: hit._score,
        }));
      })
      .catch((error: Error) => {
        const data = isAxiosError(error) ? error.response?.data : error.message;
        this.logger.error(data);
        throw new Error(data);
      });
  }

  /**
   * Generates an ElasticQueryDto based on the provided parameters.
   *
   * @template T - The type of the data to be queried.
   * @param {string} toFind - The string to search for.
   * @param {Array<keyof T>} fieldsToSearchOn - The fields to search on.
   * @param {Array<TypeSort<T>>} fieldsToSortOn - The fields to sort on.
   * @returns {ElasticQueryDto<T>} - The generated ElasticQueryDto.
   */
  protected _getElasticQuery<T>(
    toFind: string,
    size: number,
    fieldsToSearchOn: string[],
    fieldsToSortOn: TypeSort<T>[],
    toFilter?: string,
    fieldToFilterOn?: keyof T,
  ): ElasticQueryDto<T> {
    const query: ElasticQueryDto<T> = {
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: toFind,
                      fields: fieldsToSearchOn as (keyof T)[],
                      operator: 'and',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      sort: [{ _score: { order: 'desc' } }, ...fieldsToSortOn],
    };
    const individualKeywords = toFind.split(/\s+/);

    if (toFilter && fieldToFilterOn) {
      query.query.bool.filter = [
        {
          term: {
            [fieldToFilterOn]: toFilter,
          } as OpenSearchTerms<T>,
        },
      ];
    }

    const wildcardQueries = fieldsToSearchOn.flatMap((field) =>
      individualKeywords.map((keyword) => {
        const wildcardQuery: OpenSearchOperator<T> = {
          wildcard: {
            [field]: `*${keyword}*`,
          } as OpenSearchWildcard<T>,
        };
        return wildcardQuery;
      }),
    );

    //icky but necessary
    (query.query.bool.must[0] as OpenSearchQuery<T>).bool.should.push(
      ...wildcardQueries,
    );

    return query;
  }

  private _getDeepKeys(data: any, prefix: string = ''): string[] {
    let keys: string[] = [];
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof data[key] === 'object' && data[key] !== null) {
          keys = keys.concat(this._getDeepKeys(data[key], newKey));
        } else {
          keys.push(newKey);
        }
      }
    }
    return keys;
  }
}
