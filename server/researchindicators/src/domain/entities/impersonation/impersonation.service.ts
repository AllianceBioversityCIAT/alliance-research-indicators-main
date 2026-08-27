// @akili-spec changes/profile-simulation
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ImpersonationSession } from './entities/impersonation-session.entity';
import { ImpersonationAction } from './entities/impersonation-action.entity';
import { ImpersonationEndReasonEnum } from './enum/impersonation-end-reason.enum';
import { ImpersonationErrorCodeEnum } from './enum/impersonation-error-code.enum';
import { ImpersonationServiceError } from './errors/impersonation-service.error';
import { ImpersonationUserRepository } from './repositories/impersonation-user.repository';
import {
  CurrentResult,
  ImpersonationActorSummary,
  ImpersonationBlockedReason,
  ImpersonationSessionSummary,
  ImpersonationUserRow,
  ImpersonationUserSearchResult,
  LogActionInput,
  ResolveResult,
  StartResult,
  TargetProfile,
} from './types/impersonation.types';

/**
 * Session lifecycle, target resolution and action logging for profile
 * simulation (design §5). No `CurrentUserUtil` anywhere in this module
 * (design §2.0) — callers (the middleware, T-03) always pass `actorId`
 * explicitly. No in-process cache (D-imp-4) — every lookup is a live read.
 *
 * Clock: every timestamp written (`started_at`, `expires_at`, expiry
 * marking) and every expiry comparison uses the Node clock (`new Date()`),
 * never a SQL `NOW()`/`<` comparison — keeps `resolve` deterministic under
 * mocked repos (forward pointer from the T-01 review).
 */
@Injectable()
export class ImpersonationService {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: ImpersonationService.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ImpersonationSession)
    private readonly sessionRepository: Repository<ImpersonationSession>,
    @InjectRepository(ImpersonationAction)
    private readonly actionRepository: Repository<ImpersonationAction>,
    private readonly userRepository: ImpersonationUserRepository,
    private readonly appConfig: AppConfig,
  ) {}

  /** R-IMP-001. */
  async searchUsers(
    search: string,
    actorId: number,
  ): Promise<ImpersonationUserSearchResult[]> {
    const trimmed = (search ?? '').trim();
    const rows = await this.userRepository.searchUsers(trimmed);
    return rows.map((row) => this.toSearchResult(row, actorId));
  }

  private toSearchResult(
    row: ImpersonationUserRow,
    actorId: number,
  ): ImpersonationUserSearchResult {
    const blocked_reason = this.blockedReasonFor(row, actorId);
    return {
      ...row,
      simulable: !blocked_reason,
      blocked_reason,
    };
  }

  /**
   * Precedence when several block conditions apply to one row: self first
   * (you can never simulate yourself, independent of role/status), then
   * system_admin, then inactive.
   */
  private blockedReasonFor(
    row: ImpersonationUserRow,
    actorId: number,
  ): ImpersonationBlockedReason | undefined {
    if (row.sec_user_id === actorId) {
      return 'self';
    }
    if (row.roles?.some((role) => role.role_id === SecRolesEnum.SYSTEM_ADMIN)) {
      return 'system_admin';
    }
    if (!row.is_active) {
      return 'inactive';
    }
    return undefined;
  }

  /** Full target profile, used by `start`/`resolve`/`current`. */
  async findProfile(userId: number): Promise<TargetProfile | null> {
    return this.userRepository.findProfile(userId);
  }

  /** R-IMP-002. */
  async start(
    actorId: number,
    targetUserId: number,
    reason?: string,
  ): Promise<StartResult> {
    if (targetUserId === actorId) {
      throw new ImpersonationServiceError(
        ImpersonationErrorCodeEnum.TARGET_IS_SELF,
        HttpStatus.CONFLICT,
        'Cannot simulate your own account',
      );
    }

    const target = await this.userRepository.findProfile(targetUserId);
    if (!target || !target.is_active) {
      throw new ImpersonationServiceError(
        ImpersonationErrorCodeEnum.TARGET_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'Target user not found or inactive',
      );
    }

    const isTargetAdmin = target.user_role_list?.some(
      (userRole) =>
        userRole.is_active &&
        userRole.role?.sec_role_id === SecRolesEnum.SYSTEM_ADMIN,
    );
    if (isTargetAdmin) {
      throw new ImpersonationServiceError(
        ImpersonationErrorCodeEnum.TARGET_IS_ADMIN,
        HttpStatus.CONFLICT,
        'Cannot simulate a System Admin account',
      );
    }

    const now = new Date();
    const sessionId = randomUUID();
    const expiresAt = new Date(
      now.getTime() + this.appConfig.IMPERSONATION_TTL_MINUTES * 60_000,
    );

    const session = await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(ImpersonationSession);

      // One open session per actor: supersede any still-open session.
      await sessionRepo
        .createQueryBuilder()
        .update(ImpersonationSession)
        .set({
          ended_at: now,
          end_reason: ImpersonationEndReasonEnum.SUPERSEDED,
          updated_by: actorId,
        })
        .where('actor_user_id = :actorId', { actorId })
        .andWhere('ended_at IS NULL')
        .execute();

      const newSession = sessionRepo.create({
        session_id: sessionId,
        actor_user_id: actorId,
        target_user_id: targetUserId,
        reason,
        started_at: now,
        expires_at: expiresAt,
        created_by: actorId,
      });

      return sessionRepo.save(newSession);
    });

    this.logger._warn(
      `impersonation.start actor_user_id=${actorId} target_user_id=${targetUserId} session_id=${sessionId}`,
    );

    return {
      session: this.toSessionSummary(session),
      user: target,
    };
  }

  /**
   * §5 "Resolve on every request" steps 5-7. Route-specific tolerance
   * (ended/expired allowed only on `/end`/`/current`) is the middleware's
   * job (T-03) — this only reports what the session's state actually is,
   * marking lazy expiry as a side effect when it applies.
   */
  async resolve(sessionId: string, actorId: number): Promise<ResolveResult> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId, actor_user_id: actorId, is_active: true },
    });

    if (!session) {
      return { state: 'invalid' };
    }

    if (session.ended_at) {
      return { state: 'ended', session: this.toSessionSummary(session) };
    }

    const now = new Date();
    if (session.expires_at.getTime() < now.getTime()) {
      session.ended_at = now;
      session.end_reason = ImpersonationEndReasonEnum.EXPIRED;
      session.updated_by = actorId;
      await this.sessionRepository.save(session);
      // NFR-IMP-004 — lazy expiry marking, logged as a rejection reason.
      this.logger._warn(
        `impersonation.expired actor_user_id=${actorId} target_user_id=${session.target_user_id} session_id=${sessionId} reason=expired`,
      );
      return { state: 'expired', session: this.toSessionSummary(session) };
    }

    const target = await this.userRepository.findProfile(
      session.target_user_id,
    );
    return {
      state: 'valid',
      target,
      session: this.toSessionSummary(session),
    };
  }

  /** R-IMP-004 `/end` — idempotent; foreign/unknown session -> invalid. */
  async end(
    sessionId: string,
    actorId: number,
    reason: 'manual' | 'logout',
  ): Promise<ImpersonationSessionSummary> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId, actor_user_id: actorId, is_active: true },
    });

    if (!session) {
      throw new ImpersonationServiceError(
        ImpersonationErrorCodeEnum.SESSION_INVALID,
        HttpStatus.FORBIDDEN,
        'Impersonation session invalid',
      );
    }

    if (!session.ended_at) {
      session.ended_at = new Date();
      session.end_reason =
        reason === 'logout'
          ? ImpersonationEndReasonEnum.LOGOUT
          : ImpersonationEndReasonEnum.MANUAL;
      session.updated_by = actorId;
      await this.sessionRepository.save(session);
      // NFR-IMP-004 — full attribution on end (was session_id-only).
      this.logger._warn(
        `impersonation.end actor_user_id=${actorId} target_user_id=${session.target_user_id} session_id=${sessionId} reason=${reason}`,
      );
    }

    return this.toSessionSummary(session);
  }

  /** R-IMP-004 `/current`. */
  async current(sessionId: string, actorId: number): Promise<CurrentResult> {
    if (!sessionId) {
      return { active: false };
    }

    const result = await this.resolve(sessionId, actorId);
    if (result.state !== 'valid') {
      return { active: false };
    }

    const actorProfile = await this.userRepository.findProfile(actorId);

    return {
      active: true,
      session: result.session,
      actor: actorProfile ? this.toActorSummary(actorProfile) : undefined,
      user: result.target,
    };
  }

  /**
   * R-IMP-005. Fire-and-forget by design: rejections are caught here so a
   * caller that does not await this call never sees an unhandled
   * rejection, and the handler's response is never affected.
   */
  async logAction(input: LogActionInput): Promise<void> {
    try {
      const action = this.actionRepository.create({
        session_id: input.session_id,
        method: input.method,
        route_pattern: input.route_pattern,
        path: input.path,
        status_code: input.status_code,
        result_official_code: input.result_official_code,
      });
      await this.actionRepository.save(action);
    } catch (error) {
      this.logger._error(
        `impersonation.logAction failed session_id=${input.session_id}: ${
          error?.message ?? error
        }`,
      );
    }
  }

  private toSessionSummary(
    session: ImpersonationSession,
  ): ImpersonationSessionSummary {
    return {
      session_id: session.session_id,
      started_at: session.started_at,
      expires_at: session.expires_at,
      ended_at: session.ended_at,
      end_reason: session.end_reason,
    };
  }

  private toActorSummary(profile: TargetProfile): ImpersonationActorSummary {
    return {
      sec_user_id: profile.sec_user_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
    };
  }
}
