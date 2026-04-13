import { UpdateDataUtil } from './update-data.util';
import { Result } from '../../entities/results/entities/result.entity';

describe('UpdateDataUtil', () => {
  it('updateLastUpdatedDate updates empty payload without userId', async () => {
    const repo = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as any;
    const util = new UpdateDataUtil(dataSource);
    await util.updateLastUpdatedDate(55);
    expect(dataSource.getRepository).toHaveBeenCalledWith(Result);
    expect(repo.update).toHaveBeenCalledWith(55, {});
  });

  it('updateLastUpdatedDate sets updated_by when userId provided', async () => {
    const repo = { update: jest.fn().mockResolvedValue({}) };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as any;
    const util = new UpdateDataUtil(dataSource);
    await util.updateLastUpdatedDate(3, undefined, 8);
    expect(repo.update).toHaveBeenCalledWith(3, { updated_by: 8 });
  });
});
