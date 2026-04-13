import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  it('should be defined with DataSource', () => {
    const dataSource = {} as DataSource;
    const repo = new UserRepository(dataSource);
    expect(repo).toBeDefined();
  });
});
