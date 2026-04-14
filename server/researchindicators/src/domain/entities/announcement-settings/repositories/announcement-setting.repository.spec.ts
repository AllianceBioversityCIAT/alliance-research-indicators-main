import { DataSource } from 'typeorm';
import { AnnouncementSettingRepository } from './announcement-setting.repository';

describe('AnnouncementSettingRepository', () => {
  it('should extend TypeORM repository for AnnouncementSetting', () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repo = new AnnouncementSettingRepository(dataSource);
    expect(repo).toBeDefined();
  });
});
