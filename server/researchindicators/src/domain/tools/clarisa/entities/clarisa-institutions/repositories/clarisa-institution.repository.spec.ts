import { DataSource } from 'typeorm';
import { ClarisaInstitutionsRepository } from './clarisa-institution.repository';

describe('ClarisaInstitutionsRepository', () => {
  let repository: ClarisaInstitutionsRepository;
  let findOneSpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new ClarisaInstitutionsRepository(dataSource);
    findOneSpy = jest.spyOn(repository, 'findOne');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lastInsertDate returns null when no dates', async () => {
    findOneSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(repository.lastInsertDate()).resolves.toBeNull();
  });

  it('lastInsertDate returns unix seconds from latest updated_at', async () => {
    const d = new Date('2024-06-01T12:00:00.000Z');
    findOneSpy
      .mockResolvedValueOnce({ created_at: d })
      .mockResolvedValueOnce({ updated_at: d });
    const n = await repository.lastInsertDate();
    expect(n).toBe(Math.round(d.getTime() / 1000));
  });
});
