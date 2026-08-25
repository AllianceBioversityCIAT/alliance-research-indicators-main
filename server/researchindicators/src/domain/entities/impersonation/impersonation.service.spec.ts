// @akili-spec changes/profile-simulation
import { HttpStatus } from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationEndReasonEnum } from './enum/impersonation-end-reason.enum';
import { ImpersonationErrorCodeEnum } from './enum/impersonation-error-code.enum';
import { TargetProfile } from './types/impersonation.types';

describe('ImpersonationService', () => {
  let service: ImpersonationService;

  const queryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const txSessionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };

  const manager = {
    getRepository: jest.fn().mockReturnValue(txSessionRepo),
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (m: any) => any) => cb(manager)),
  };

  const sessionRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (row) => row),
  };

  const actionRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(),
  };

  const userRepository = {
    searchUsers: jest.fn(),
    findProfile: jest.fn(),
  };

  const appConfig = {
    IMPERSONATION_TTL_MINUTES: 240,
  };

  const activeTargetProfile: TargetProfile = {
    sec_user_id: 20,
    first_name: 'Target',
    last_name: 'User',
    email: 'target@example.com',
    is_active: true,
    status_id: 1,
    user_role_list: [
      {
        is_active: true,
        user_id: 20,
        role_id: 3,
        role: {
          role_id: 3,
          sec_role_id: 3,
          focus_id: 1,
          name: 'Contributor',
          is_active: true,
          justification_update: null,
        },
      },
    ],
  };

  const adminTargetProfile: TargetProfile = {
    ...activeTargetProfile,
    sec_user_id: 30,
    user_role_list: [
      {
        is_active: true,
        user_id: 30,
        role_id: 1,
        role: {
          role_id: 1,
          sec_role_id: 1,
          focus_id: 1,
          name: 'System Admin',
          is_active: true,
          justification_update: null,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.update.mockReturnThis();
    queryBuilder.set.mockReturnThis();
    queryBuilder.where.mockReturnThis();
    queryBuilder.andWhere.mockReturnThis();
    queryBuilder.execute.mockResolvedValue({ affected: 0 });
    txSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    txSessionRepo.create.mockImplementation((row) => row);
    txSessionRepo.save.mockImplementation(async (row) => row);
    manager.getRepository.mockReturnValue(txSessionRepo);
    sessionRepository.save.mockImplementation(async (row) => row);
    actionRepository.create.mockImplementation((row) => row);

    service = new ImpersonationService(
      dataSource as any,
      sessionRepository as any,
      actionRepository as any,
      userRepository as any,
      appConfig as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers', () => {
    it('marks the actor row simulable=false, blocked_reason=self when sec_user_id === actorId', async () => {
      userRepository.searchUsers.mockResolvedValue([
        {
          sec_user_id: 10,
          first_name: 'Actor',
          last_name: 'Admin',
          email: 'actor@example.com',
          is_active: true,
          roles: [{ role_id: 1, name: 'System Admin' }],
        },
      ]);

      const result = await service.searchUsers('actor', 10);

      expect(result).toEqual([
        expect.objectContaining({ simulable: false, blocked_reason: 'self' }),
      ]);
    });

    it('marks a SYSTEM_ADMIN target row simulable=false, blocked_reason=system_admin (AC.2)', async () => {
      userRepository.searchUsers.mockResolvedValue([
        {
          sec_user_id: 30,
          first_name: 'Another',
          last_name: 'Admin',
          email: 'admin2@example.com',
          is_active: true,
          roles: [{ role_id: 1, name: 'System Admin' }],
        },
      ]);

      const result = await service.searchUsers('admin', 10);

      expect(result[0]).toMatchObject({
        simulable: false,
        blocked_reason: 'system_admin',
      });
    });

    it('marks an inactive row simulable=false, blocked_reason=inactive', async () => {
      userRepository.searchUsers.mockResolvedValue([
        {
          sec_user_id: 40,
          first_name: 'Old',
          last_name: 'User',
          email: 'old@example.com',
          is_active: false,
          roles: [],
        },
      ]);

      const result = await service.searchUsers('old', 10);

      expect(result[0]).toMatchObject({
        simulable: false,
        blocked_reason: 'inactive',
      });
    });

    it('marks an active non-admin, non-self row simulable=true with no blocked_reason', async () => {
      userRepository.searchUsers.mockResolvedValue([
        {
          sec_user_id: 20,
          first_name: 'Target',
          last_name: 'User',
          email: 'target@example.com',
          is_active: true,
          roles: [{ role_id: 3, name: 'Contributor' }],
        },
      ]);

      const result = await service.searchUsers('target', 10);

      expect(result[0]).toMatchObject({ simulable: true });
      expect(result[0].blocked_reason).toBeUndefined();
    });

    it('trims the search term before delegating to the repository', async () => {
      userRepository.searchUsers.mockResolvedValue([]);
      await service.searchUsers('  rojas  ', 10);
      expect(userRepository.searchUsers).toHaveBeenCalledWith('rojas');
    });
  });

  describe('findProfile', () => {
    it('delegates directly to the repository and returns its result unchanged', async () => {
      userRepository.findProfile.mockResolvedValue(activeTargetProfile);
      await expect(service.findProfile(20)).resolves.toBe(activeTargetProfile);
      expect(userRepository.findProfile).toHaveBeenCalledWith(20);
    });
  });

  describe('start', () => {
    it('rejects target_user_id === actorId with 409 TARGET_IS_SELF', async () => {
      await expect(service.start(10, 10)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.TARGET_IS_SELF,
        status: HttpStatus.CONFLICT,
      });
      expect(userRepository.findProfile).not.toHaveBeenCalled();
    });

    it('rejects a missing target (findProfile resolves null) with 404 TARGET_NOT_FOUND', async () => {
      userRepository.findProfile.mockResolvedValue(null);
      await expect(service.start(10, 999)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.TARGET_NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('rejects an inactive target (is_active=false) with 404 TARGET_NOT_FOUND', async () => {
      userRepository.findProfile.mockResolvedValue({
        ...activeTargetProfile,
        is_active: false,
      });
      await expect(service.start(10, 20)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.TARGET_NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('rejects a target holding SYSTEM_ADMIN with 409 TARGET_IS_ADMIN', async () => {
      userRepository.findProfile.mockResolvedValue(adminTargetProfile);
      await expect(service.start(10, 30)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.TARGET_IS_ADMIN,
        status: HttpStatus.CONFLICT,
      });
    });

    it('on the happy path, supersedes any open session of the same actor before inserting the new one', async () => {
      userRepository.findProfile.mockResolvedValue(activeTargetProfile);

      const result = await service.start(10, 20, 'investigating a bug');

      // Supersede update ran inside the transaction, scoped to this actor's open sessions.
      expect(queryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          end_reason: ImpersonationEndReasonEnum.SUPERSEDED,
          updated_by: 10,
        }),
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'actor_user_id = :actorId',
        { actorId: 10 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ended_at IS NULL');
      expect(queryBuilder.execute).toHaveBeenCalled();

      // New session inserted with created_by = actor.
      expect(txSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: 10,
          target_user_id: 20,
          reason: 'investigating a bug',
          created_by: 10,
        }),
      );
      expect(txSessionRepo.save).toHaveBeenCalled();

      expect(result.user).toBe(activeTargetProfile);
      expect(result.session.session_id).toEqual(expect.any(String));
      expect(result.session.expires_at.getTime()).toBeGreaterThan(
        result.session.started_at.getTime(),
      );
    });

    it('computes expires_at as started_at + AppConfig.IMPERSONATION_TTL_MINUTES', async () => {
      userRepository.findProfile.mockResolvedValue(activeTargetProfile);
      appConfig.IMPERSONATION_TTL_MINUTES = 60;

      const result = await service.start(10, 20);

      const diffMinutes =
        (result.session.expires_at.getTime() -
          result.session.started_at.getTime()) /
        60_000;
      expect(diffMinutes).toBe(60);

      appConfig.IMPERSONATION_TTL_MINUTES = 240;
    });
  });

  describe('resolve', () => {
    it('returns state=invalid when no owned session row is found (foreign/unknown session_id)', async () => {
      sessionRepository.findOne.mockResolvedValue(null);
      await expect(service.resolve('foreign-session', 10)).resolves.toEqual({
        state: 'invalid',
      });
    });

    it('returns state=ended without touching the row when ended_at is already set', async () => {
      sessionRepository.findOne.mockResolvedValue({
        session_id: 's1',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date('2026-08-20T00:00:00Z'),
        expires_at: new Date('2026-08-20T04:00:00Z'),
        ended_at: new Date('2026-08-20T01:00:00Z'),
        end_reason: ImpersonationEndReasonEnum.MANUAL,
      });

      const result = await service.resolve('s1', 10);

      expect(result.state).toBe('ended');
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('returns state=expired and marks end_reason=expired when a session started 241 minutes ago (TTL 240) is resolved', async () => {
      const now = Date.now();
      const session = {
        session_id: 's2',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date(now - 241 * 60_000),
        expires_at: new Date(now - 1 * 60_000),
        ended_at: undefined,
        end_reason: undefined,
      };
      sessionRepository.findOne.mockResolvedValue(session);

      const result = await service.resolve('s2', 10);

      expect(result.state).toBe('expired');
      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          end_reason: ImpersonationEndReasonEnum.EXPIRED,
          updated_by: 10,
        }),
      );
      expect(session.ended_at).toBeInstanceOf(Date);
    });

    it('returns state=valid with the target profile when the session is owned and not expired', async () => {
      const now = Date.now();
      sessionRepository.findOne.mockResolvedValue({
        session_id: 's3',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date(now - 5 * 60_000),
        expires_at: new Date(now + 235 * 60_000),
        ended_at: undefined,
        end_reason: undefined,
      });
      userRepository.findProfile.mockResolvedValue(activeTargetProfile);

      const result = await service.resolve('s3', 10);

      expect(result).toMatchObject({
        state: 'valid',
        target: activeTargetProfile,
      });
      expect(userRepository.findProfile).toHaveBeenCalledWith(20);
    });
  });

  describe('end', () => {
    it('throws SESSION_INVALID (403) for a session not owned by this actor (foreign session)', async () => {
      sessionRepository.findOne.mockResolvedValue(null);
      await expect(service.end('s1', 10, 'manual')).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('ends an open session, setting ended_at/end_reason/updated_by', async () => {
      const session = {
        session_id: 's1',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
        ended_at: undefined,
        end_reason: undefined,
      };
      sessionRepository.findOne.mockResolvedValue(session);

      const result = await service.end('s1', 10, 'manual');

      expect(session.ended_at).toBeInstanceOf(Date);
      expect(session.end_reason).toBe(ImpersonationEndReasonEnum.MANUAL);
      expect(sessionRepository.save).toHaveBeenCalledWith(session);
      expect(result.session_id).toBe('s1');
    });

    it('is idempotent: calling end twice on the same already-ended row does not overwrite it and returns the same row', async () => {
      const endedAt = new Date('2026-08-20T01:00:00Z');
      const session = {
        session_id: 's1',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date('2026-08-20T00:00:00Z'),
        expires_at: new Date('2026-08-20T04:00:00Z'),
        ended_at: endedAt,
        end_reason: ImpersonationEndReasonEnum.EXPIRED,
      };
      sessionRepository.findOne.mockResolvedValue(session);

      const result = await service.end('s1', 10, 'manual');

      expect(sessionRepository.save).not.toHaveBeenCalled();
      expect(session.end_reason).toBe(ImpersonationEndReasonEnum.EXPIRED);
      expect(result.ended_at).toBe(endedAt);
    });
  });

  describe('current', () => {
    it('returns {active:false} when no session_id is supplied', async () => {
      await expect(service.current('', 10)).resolves.toEqual({ active: false });
      expect(sessionRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns {active:false} when resolve() reports a non-valid state (e.g. ended)', async () => {
      sessionRepository.findOne.mockResolvedValue({
        session_id: 's1',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
        ended_at: new Date(),
        end_reason: ImpersonationEndReasonEnum.MANUAL,
      });

      await expect(service.current('s1', 10)).resolves.toEqual({
        active: false,
      });
    });

    it('returns {active:true, session, actor, user} when resolve() reports valid', async () => {
      const now = Date.now();
      sessionRepository.findOne.mockResolvedValue({
        session_id: 's1',
        actor_user_id: 10,
        target_user_id: 20,
        started_at: new Date(now - 5 * 60_000),
        expires_at: new Date(now + 235 * 60_000),
        ended_at: undefined,
        end_reason: undefined,
      });
      userRepository.findProfile
        .mockResolvedValueOnce(activeTargetProfile) // resolve() -> target
        .mockResolvedValueOnce({
          sec_user_id: 10,
          first_name: 'Actor',
          last_name: 'Admin',
          email: 'actor@example.com',
          is_active: true,
          status_id: 1,
          user_role_list: [],
        });

      const result = await service.current('s1', 10);

      expect(result.active).toBe(true);
      expect(result.user).toBe(activeTargetProfile);
      expect(result.actor).toEqual({
        sec_user_id: 10,
        first_name: 'Actor',
        last_name: 'Admin',
        email: 'actor@example.com',
      });
    });
  });

  describe('logAction', () => {
    it('inserts a row with the given fields for a non-GET request', async () => {
      await service.logAction({
        session_id: 's1',
        method: 'PATCH',
        route_pattern: '/results/:resultCode/general-information',
        path: '/api/v1/results/123/general-information',
        status_code: 200,
        result_official_code: 123,
      });

      expect(actionRepository.create).toHaveBeenCalledWith({
        session_id: 's1',
        method: 'PATCH',
        route_pattern: '/results/:resultCode/general-information',
        path: '/api/v1/results/123/general-information',
        status_code: 200,
        result_official_code: 123,
      });
      expect(actionRepository.save).toHaveBeenCalled();
    });

    it('does not throw and logs via LoggerUtil.error when the insert rejects', async () => {
      actionRepository.save.mockRejectedValueOnce(new Error('db down'));
      const errorSpy = jest
        .spyOn((service as any).logger, '_error')
        .mockImplementation(() => undefined);

      await expect(
        service.logAction({
          session_id: 's1',
          method: 'POST',
          route_pattern: '/results',
          path: '/api/v1/results',
          status_code: 500,
        }),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('impersonation.logAction failed'),
      );
      errorSpy.mockRestore();
    });
  });
});
