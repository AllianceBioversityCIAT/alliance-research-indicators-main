import { AxiosRequestConfig, isAxiosError } from 'axios';
import { BaseApi } from '../../core/base-api';
import { HttpService } from '@nestjs/axios';
import {
  ElasticQueryDto,
  OpenSearchOperator,
  OpenSearchQuery,
  OpenSearchSort,
  OpenSearchTerms,
  OpenSearchWildcard,
} from '../dto/elastic-query.dto';
import { ElasticResponse } from '../dto/elastic-response.dto';
import { lastValueFrom } from 'rxjs';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { SearchFields } from './types/base-open-search.types';
import { isEmpty } from '../../../shared/utils/object.utils';

export abstract class BaseExternalOpenSearchApi<
  OpenSearchEntity,
> extends BaseApi {
  protected readonly _primaryKey: keyof OpenSearchEntity;
  protected readonly _index: string;
  protected _config: AxiosRequestConfig;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly _appConfig: AppConfig,
    opensearchHost: string,
    private readonly opensearchUser: string,
    private readonly opensearchPass: string,
    customPrimaryKey: keyof OpenSearchEntity,
    indexListName: string[],
  ) {
    super(
      httpService,
      opensearchHost,
      BaseExternalOpenSearchApi.name,
      opensearchUser,
      opensearchPass,
    );
    this._config = <Readonly<AxiosRequestConfig>>{
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.opensearchUser}:${this.opensearchPass}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-ndjson',
      },
    };
    this._primaryKey = customPrimaryKey as keyof OpenSearchEntity;

    this._index = indexListName.map((name) => name.trim()).join(',');
  }

  async search(
    query?: string,
    fieldsToSearchOn: SearchFields<OpenSearchEntity> = {},
    size: number = 20,
    from: number = 0,
    filter?: string,
    fieldToFilterOn?: keyof OpenSearchEntity,
  ): Promise<{
    total: number;
    currentSize: number;
    data: (OpenSearchEntity & { score: number })[];
  }> {
    const listOfFieldsToSearch = this._getDeepKeys(fieldsToSearchOn);
    const elasticQuery = this._getElasticQuery<OpenSearchEntity>(
      query,
      size,
      from,
      listOfFieldsToSearch,
      filter,
      fieldToFilterOn,
    );

    return lastValueFrom(
      this.postRequest<
        ElasticQueryDto<OpenSearchEntity>,
        ElasticResponse<OpenSearchEntity>
      >(`${this._index}/_search`, elasticQuery, this._config),
    )
      .then((response) => {
        if (isEmpty(response?.data?.hits?.hits))
          return { total: 0, currentSize: 0, data: [] };
        const data = response.data.hits.hits.map((hit) => ({
          ...hit._source,
          score: hit._score,
        }));

        return {
          total: response.data.hits.total.value,
          currentSize: data.length,
          data,
        };
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
    from: number,
    fieldsToSearchOn: string[],
    toFilter?: string,
    fieldToFilterOn?: keyof T,
  ): ElasticQueryDto<T> {
    const query: ElasticQueryDto<T> = {
      size,
      from,
      query: isEmpty(fieldsToSearchOn)
        ? { match_all: {} }
        : {
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
      sort: [{ [this._primaryKey]: { order: 'desc' } } as OpenSearchSort<T>],
    };

    if (!isEmpty(fieldsToSearchOn)) {
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
    }

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
