import { HttpStatus } from '@nestjs/common';
import { PooledFundingMonitorController } from './pooled-funding-monitor.controller';
import { PooledFundingMonitorService } from './pooled-funding-monitor.service';
import { PfmScopeEnum } from './enum/pfm-scope.enum';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05
// Guard + route + validation + envelope are exercised over real HTTP in
// test/pooled-funding-monitor.e2e-spec.ts (e2e); this spec pins the hand-off.

describe('PooledFundingMonitorController', () => {
  const service = {
    getSummary: jest.fn().mockResolvedValue({ s: 1 }),
    getQueue: jest.fn().mockResolvedValue({ q: 1 }),
    getProjectResults: jest.fn().mockResolvedValue([{ r: 1 }]),
  } as unknown as jest.Mocked<PooledFundingMonitorService>;
  const controller = new PooledFundingMonitorController(service);
  const req = { user: { sec_user_id: 12 } } as never;

  it('summary passes the authenticated id and wraps the data', async () => {
    const res = await controller.getSummary(req, { scope: PfmScopeEnum.ALL });
    expect(service.getSummary).toHaveBeenCalledWith(12, PfmScopeEnum.ALL);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.data).toEqual({ s: 1 });
  });

  it('queue passes the whole query', async () => {
    const query = { scope: PfmScopeEnum.MINE, project: 'P-A' };
    const res = await controller.getQueue(req, query);
    expect(service.getQueue).toHaveBeenCalledWith(12, query);
    expect(res.data).toEqual({ q: 1 });
  });

  it('project results pass the path param and the query', async () => {
    const res = await controller.getProjectResults(
      req,
      { projectCode: 'P-A' },
      {},
    );
    expect(service.getProjectResults).toHaveBeenCalledWith(12, 'P-A', {});
    expect(res.data).toEqual([{ r: 1 }]);
  });
});
