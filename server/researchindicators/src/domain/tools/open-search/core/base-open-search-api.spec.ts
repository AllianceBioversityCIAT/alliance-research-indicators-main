import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ElasticFindEntity } from '../dto/elastic-find-entity.dto';
import {
  ElasticOperationDto,
  ElasticOperationEnum,
} from '../dto/elastic-operation.dto';
import { BaseOpenSearchApi } from './base-open-search-api';

class Row {
  result_id!: number;
}

class OsShape {
  result_id!: number;
  name?: string;
}

type TestRepo = Repository<Row> & ElasticFindEntity<OsShape>;

class TestOpenSearchApi extends BaseOpenSearchApi<Row, OsShape, TestRepo> {
  public single(
    doc: string,
    op: ElasticOperationDto<OsShape>,
    fromBulk = false,
  ) {
    return this.getSingleElasticOperation(doc, op, fromBulk);
  }

  public bulk(doc: string, ops: ElasticOperationDto<OsShape>[]) {
    return this.getBulkElasticOperation(doc, ops);
  }

  public elasticQuery(
    q: string,
    size: number,
    fields: string[],
    sort: { [k: string]: { order: string } }[],
    filter?: string,
    fieldFilter?: keyof OsShape,
  ) {
    return this._getElasticQuery<OsShape>(
      q,
      size,
      fields,
      sort,
      filter,
      fieldFilter,
    );
  }
}

function ax<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

describe('BaseOpenSearchApi', () => {
  let httpService: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
  let appConfig: AppConfig;
  let repo: TestRepo;
  let api: TestOpenSearchApi;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    httpService = {
      get: jest.fn(() => of(ax({}))),
      post: jest.fn(() => of(ax({}))),
      put: jest.fn(() => of(ax({}))),
      delete: jest.fn(() => of(ax({}))),
    };

    appConfig = {
      OPEN_SEARCH_URL: 'https://os.example',
      OPEN_SEARCH_USER: 'u',
      OPEN_SEARCH_PASS: 'p',
      OPEN_SEARCH_BASE_INDEX: 'base',
    } as AppConfig;

    repo = {
      metadata: {
        primaryColumns: [{ propertyName: 'result_id' }],
        tableName: 'my_result',
      },
      findDataForOpenSearch: jest.fn(),
    } as unknown as TestRepo;

    api = new TestOpenSearchApi(
      httpService as unknown as HttpService,
      repo,
      appConfig,
      undefined,
      undefined,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes humanized tableName', () => {
    expect(api.tableName).toBe('my result');
  });

  it('getSingleElasticOperation builds PATCH, DELETE and PUT lines', () => {
    const patch = api.single(
      'idx',
      new ElasticOperationDto(ElasticOperationEnum.PATCH, {
        result_id: 1,
        name: 'a',
      }),
      false,
    );
    expect(patch).toContain('"index"');
    expect(patch).toContain('"result_id":1');
    expect(patch).toContain('name');

    const del = api.single(
      'idx',
      new ElasticOperationDto(ElasticOperationEnum.DELETE, { result_id: 2 }),
      true,
    );
    expect(del).toContain('"delete"');
    expect(del).not.toMatch(/\n\{"/);

    const put = api.single(
      'idx',
      new ElasticOperationDto(ElasticOperationEnum.PUT, {
        result_id: 3,
        name: 'x',
      }),
      false,
    );
    expect(put).toContain('"update"');
    expect(put).toContain('"doc"');
  });

  it('getBulkElasticOperation batches newline-separated operations', () => {
    const ops = [
      new ElasticOperationDto(ElasticOperationEnum.PATCH, { result_id: 10 }),
      new ElasticOperationDto(ElasticOperationEnum.PATCH, { result_id: 11 }),
    ];
    const batches = api.bulk('idx', ops);
    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches.join('')).toContain('10');
    expect(batches.join('')).toContain('11');
  });

  it('findForOpenSearch maps rows to bulk JSON or throws when empty', async () => {
    (repo.findDataForOpenSearch as jest.Mock).mockResolvedValueOnce([]);
    await expect(api.findForOpenSearch('idx')).rejects.toThrow('No data found');

    (repo.findDataForOpenSearch as jest.Mock).mockResolvedValueOnce([
      { result_id: 5, name: 'n' },
    ]);
    const bulk = await api.findForOpenSearch('idx');
    expect(Array.isArray(bulk)).toBe(true);
    expect(bulk[0]).toContain('"5"');
  });

  it('sendBulkOperationToOpenSearch posts each chunk', async () => {
    await api.sendBulkOperationToOpenSearch(['a', 'b']);
    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(httpService.post.mock.calls[0][0]).toContain('_bulk');
  });

  it('uploadSingleToOpenSearch resolves id through repository', async () => {
    (repo.findDataForOpenSearch as jest.Mock).mockResolvedValue([
      { result_id: 9 },
    ]);
    await api.uploadSingleToOpenSearch(9);
    expect(repo.findDataForOpenSearch).toHaveBeenCalled();
    expect(httpService.post).toHaveBeenCalled();
  });

  it('uploadSingleToOpenSearch accepts partial document payload', async () => {
    await api.uploadSingleToOpenSearch({ result_id: 7 });
    expect(repo.findDataForOpenSearch).not.toHaveBeenCalled();
    expect(httpService.post).toHaveBeenCalled();
  });

  it('uploadToOpenSearch handles numeric id list', async () => {
    (repo.findDataForOpenSearch as jest.Mock).mockResolvedValue([
      { result_id: 1 },
    ]);
    await api.uploadToOpenSearch([1, 2]);
    expect(repo.findDataForOpenSearch).toHaveBeenCalled();
  });

  it('uploadToOpenSearch handles entity payloads', async () => {
    await api.uploadToOpenSearch([{ result_id: 3 } as OsShape]);
    expect(httpService.post).toHaveBeenCalled();
  });

  it('search returns [] when hits missing', async () => {
    httpService.post.mockReturnValueOnce(of(ax({ hits: { hits: [] } } as any)));
    const out = await api.search('q', { name: true } as any, [], 5);
    expect(out).toEqual([]);
  });

  it('search maps _source and score', async () => {
    httpService.post.mockReturnValueOnce(
      of(
        ax({
          hits: {
            hits: [{ _source: { result_id: 1, name: 'x' }, _score: 2.5 }],
          },
        } as any),
      ),
    );
    const out = await api.search('hello', { name: true } as any, [], 5);
    expect(out).toEqual([{ result_id: 1, name: 'x', score: 2.5 }]);
  });

  it('search applies optional term filter in query', () => {
    const q = api.elasticQuery(
      'foo bar',
      10,
      ['title'],
      [{ created: { order: 'asc' } } as any],
      'STAR',
      'result_id' as keyof OsShape,
    );
    expect(q.query.bool.filter).toBeDefined();
    expect((q.query.bool.must[0] as any).bool.should.length).toBeGreaterThan(1);
  });

  it('search returns empty hits when post fails (BaseApi handleError swallows)', async () => {
    const err = Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { data: { reason: 'bad' } },
    });
    httpService.post.mockReturnValueOnce(throwError(() => err));
    const out = await api.search('x', { a: { b: true } } as any, [], 3);
    expect(out).toEqual([]);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('resetElasticData runs delete, put and bulk pipeline', async () => {
    (repo.findDataForOpenSearch as jest.Mock).mockResolvedValue([
      { result_id: 1 },
    ]);
    const msg = await api.resetElasticData();
    expect(httpService.delete).toHaveBeenCalled();
    expect(httpService.put).toHaveBeenCalled();
    expect(httpService.post).toHaveBeenCalled();
    expect(String(msg)).toContain('reset');
  });
});
