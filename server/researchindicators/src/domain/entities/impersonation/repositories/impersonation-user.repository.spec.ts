// @akili-spec changes/profile-simulation
import { EntityManager } from 'typeorm';
import { ImpersonationUserRepository } from './impersonation-user.repository';

describe('ImpersonationUserRepository', () => {
  let repository: ImpersonationUserRepository;
  let entityManager: { query: jest.Mock };

  beforeEach(() => {
    entityManager = { query: jest.fn() };
    repository = new ImpersonationUserRepository(
      entityManager as unknown as EntityManager,
    );
  });

  describe('searchUsers', () => {
    it('wraps the trimmed search term in % LIKE % placeholders for all three columns', async () => {
      entityManager.query.mockResolvedValue([]);

      await repository.searchUsers('rojas');

      expect(entityManager.query).toHaveBeenCalledWith(expect.any(String), [
        '%rojas%',
        '%rojas%',
        '%rojas%',
      ]);
    });

    it('returns whatever rows the query resolves to, unmodified', async () => {
      const rows = [
        {
          sec_user_id: 1,
          first_name: 'A',
          last_name: 'B',
          email: 'a@b.com',
          is_active: true,
          roles: [{ role_id: 3, name: 'Contributor' }],
        },
      ];
      entityManager.query.mockResolvedValue(rows);

      await expect(repository.searchUsers('a')).resolves.toBe(rows);
    });
  });

  describe('findProfile', () => {
    it('returns null when the query resolves to an empty row set (user not found)', async () => {
      entityManager.query.mockResolvedValue([]);
      await expect(repository.findProfile(999)).resolves.toBeNull();
    });

    it('returns the first row when the query resolves a match', async () => {
      const row = {
        sec_user_id: 20,
        first_name: 'Target',
        last_name: 'User',
        email: 'target@example.com',
        is_active: true,
        status_id: 1,
        user_role_list: [],
      };
      entityManager.query.mockResolvedValue([row]);

      await expect(repository.findProfile(20)).resolves.toBe(row);
      expect(entityManager.query).toHaveBeenCalledWith(expect.any(String), [
        20,
      ]);
    });
  });
});
