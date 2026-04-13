import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  BaseControlListSave,
  ConnectionInterface,
} from './base-control-list-save';

class RowEntity {}

class TestSave extends BaseControlListSave<ConnectionInterface> {
  runBaseMap() {
    return this.base<{ id: number }, RowEntity>(
      '/items',
      RowEntity,
      (row) => ({ id: row.id }) as any,
    );
  }

  runBaseIterator() {
    return this.base<{ id: number }, RowEntity>(
      '/items',
      RowEntity,
      undefined,
      (rows) => rows.map((r) => ({ id: r.id + 10 }) as any),
    );
  }

  runBaseRaw() {
    return this.base<RowEntity, RowEntity>('/items', RowEntity);
  }

  runBaseFetchError() {
    return this.base('/broken', RowEntity);
  }

  runBatches(batchSize: number) {
    return this.baseBatches<{ v: number }, RowEntity>(
      '/many',
      RowEntity,
      batchSize,
      (x) => ({ v: x.v }) as any,
    );
  }
}

describe('BaseControlListSave', () => {
  let connection: { get: jest.Mock };
  let save: jest.Mock;
  let dataSource: { getRepository: jest.Mock };
  let logger: Logger;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    save = jest.fn();
    connection = { get: jest.fn() };
    dataSource = {
      getRepository: jest.fn().mockReturnValue({ save }),
    };
    logger = new Logger('test');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('base maps rows with mapper and saves', async () => {
    connection.get.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    save.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const svc = new TestSave(
      dataSource as unknown as DataSource,
      connection,
      logger,
    );
    const out = await svc.runBaseMap();

    expect(connection.get).toHaveBeenCalledWith('/items');
    expect(save).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(out).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('base uses iterator when provided', async () => {
    connection.get.mockResolvedValue([{ id: 1 }]);
    save.mockResolvedValue([{ id: 11 }]);

    const svc = new TestSave(
      dataSource as unknown as DataSource,
      connection,
      logger,
    );
    await svc.runBaseIterator();

    expect(save).toHaveBeenCalledWith([{ id: 11 }]);
  });

  it('base passes raw payload when no mapper or iterator', async () => {
    const raw = [{ a: 1 } as unknown as RowEntity];
    connection.get.mockResolvedValue(raw);
    save.mockResolvedValue(raw);

    const svc = new TestSave(
      dataSource as unknown as DataSource,
      connection,
      logger,
    );
    await svc.runBaseRaw();

    expect(save).toHaveBeenCalledWith(raw);
  });

  it('base swallows fetch errors and saves empty list', async () => {
    connection.get.mockRejectedValue(new Error('network'));

    const svc = new TestSave(
      dataSource as unknown as DataSource,
      connection,
      logger,
    );
    save.mockResolvedValue([]);

    await svc.runBaseFetchError();

    expect(save).toHaveBeenCalledWith([]);
  });

  it('baseBatches splits saves by batchSize', async () => {
    connection.get.mockResolvedValue([{ v: 1 }, { v: 2 }, { v: 3 }]);
    save
      .mockResolvedValueOnce([{ v: 1 }, { v: 2 }])
      .mockResolvedValueOnce([{ v: 3 }]);

    const svc = new TestSave(
      dataSource as unknown as DataSource,
      connection,
      logger,
    );
    const out = await svc.runBatches(2);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0]).toEqual([{ v: 1 }, { v: 2 }]);
    expect(save.mock.calls[1][0]).toEqual([{ v: 3 }]);
    expect(out).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
  });
});
