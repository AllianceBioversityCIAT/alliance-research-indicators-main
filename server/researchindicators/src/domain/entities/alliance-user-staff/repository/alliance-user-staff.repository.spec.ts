import { DataSource } from 'typeorm';
import { AllianceUserStaffRepository } from './alliance-user-staff.repository';
import { FindAllOptions } from '../../../shared/enum/find-all-options';

describe('AllianceUserStaffRepository', () => {
  let repository: AllianceUserStaffRepository;
  let findSpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new AllianceUserStaffRepository(dataSource);
    findSpy = jest.spyOn(repository, 'find').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('findDataForOpenSearch passes is_active when not SHOW_ALL', async () => {
    await repository.findDataForOpenSearch(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(findSpy).toHaveBeenCalledWith({
      where: { is_active: true },
    });
  });

  it('findDataForOpenSearch SHOW_ALL omits is_active filter', async () => {
    await repository.findDataForOpenSearch(FindAllOptions.SHOW_ALL);
    expect(findSpy).toHaveBeenCalledWith({ where: {} });
  });

  it('findDataForOpenSearch adds carnet In(ids)', async () => {
    await repository.findDataForOpenSearch(FindAllOptions.SHOW_ALL, [
      'A',
      'B',
    ]);
    expect(findSpy).toHaveBeenCalledWith({
      where: { carnet: expect.anything() },
    });
  });
});
