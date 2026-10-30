import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { CreateBilateralProjectMappingDto } from './dto/create-bilateral-project-mapping.dto';
import { UpdateBilateralProjectMappingDto } from './dto/update-bilateral-project-mapping.dto';
import {
  EnrichedBilateralProjectMapping,
  ListBilateralProjectMappingsQueryDto,
  PaginatedBilateralProjectMappings,
} from './dto/list-bilateral-project-mappings.query.dto';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { sqlErrorsHelper } from '../../shared/const/sql-errors.const';
import { normalizeExternalCode } from './utils/external-code.util';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080 / R-BIL-078
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements — T-BTE-01 / R-BTE-002 / NFR-BTE-003 / DD-1
// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-06 /
// R-APM-004, R-APM-006, R-APM-011, design §6.5, DD-5, DD-6.
//
// SINGLETON-SCOPED BY DESIGN — see ../bilateral/bilateral.service.ts header
// and parent design.md §3.4 Constraint A. Do NOT inject CurrentUserUtil or
// ResultsUtil; the User is passed in from the controller.
//
// create() upserts the current-year row for the agreement (active or not).
// A concurrent insert can still hit 1062, and the row lock can hit 1213 or
// 1205. Those three are retried once in a fresh transaction. A second
// failure is a mapped HTTP error, never the driver text.

export type BilateralProjectMappingUpsertResult = BilateralProjectMapping & {
  outcome: 'created' | 'updated';
};

const RETRYABLE_MYSQL_ERRNOS: ReadonlySet<number> = new Set([1062, 1213, 1205]);

const mysqlErrno = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    errno?: unknown;
    driverError?: { errno?: unknown };
  };
  if (typeof candidate.errno === 'number') return candidate.errno;
  if (typeof candidate.driverError?.errno === 'number') {
    return candidate.driverError.errno;
  }
  return undefined;
};

const isRetryableMysql = (error: unknown): boolean => {
  const errno = mysqlErrno(error);
  return errno !== undefined && RETRYABLE_MYSQL_ERRNOS.has(errno);
};

@Injectable()
export class BilateralProjectMappingService {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: BilateralProjectMappingService.name,
  });

  constructor(
    private readonly repo: BilateralProjectMappingRepository,
    private readonly dataSource: DataSource,
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly reportingYearResolver: ReportingYearResolver,
  ) {}

  async list(
    query: ListBilateralProjectMappingsQueryDto,
  ): Promise<
    PaginatedBilateralProjectMappings<EnrichedBilateralProjectMapping>
  > {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const reportingYear = await this.reportingYearResolver.resolve();

    const qb = this.repo
      .createQueryBuilder('bpm')
      .leftJoin(
        AgressoContract,
        'ac',
        'ac.agreement_id = bpm.agresso_agreement_id',
      )
      .addSelect(['ac.description', 'ac.projectDescription'])
      .andWhere('bpm.reporting_year = :reportingYear', { reportingYear })
      .orderBy('bpm.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      const normalizedStatus = query.status.toLowerCase();
      if (normalizedStatus === 'mapped') {
        qb.andWhere('bpm.is_active = :is_active', { is_active: true });
      } else if (normalizedStatus === 'inactive') {
        qb.andWhere('bpm.is_active = :is_active', { is_active: false });
      } else if (normalizedStatus === 'pending') {
        qb.andWhere('1 = 0');
      }
    } else if (query.is_active !== undefined) {
      qb.andWhere('bpm.is_active = :is_active', { is_active: query.is_active });
    }

    if (query.source !== undefined) {
      qb.andWhere('bpm.source = :source', { source: query.source });
    }

    if (query.search?.trim()) {
      qb.andWhere(
        '(bpm.agresso_agreement_id LIKE :s OR bpm.clarisa_project_short_name LIKE :s OR ac.description LIKE :s OR ac.projectDescription LIKE :s)',
        { s: `%${query.search.trim()}%` },
      );
    }

    const [rawAndEntities, total] = await Promise.all([
      qb.getRawAndEntities(),
      qb.getCount(),
    ]);

    const { entities, raw } = rawAndEntities;

    const clarisaNameMap = new Map<number, string>();
    try {
      const clarisaProjects =
        await this.clarisaProjectsService.listBilateralProjects({
          phase: reportingYear,
        });
      if (clarisaProjects) {
        for (const cp of clarisaProjects) {
          if (cp.id !== undefined && cp.id !== null) {
            clarisaNameMap.set(cp.id, cp.full_name ?? cp.short_name ?? '');
          }
        }
      }
    } catch {
      // Non-blocking if CLARISA service is temporarily unavailable
    }

    const items: EnrichedBilateralProjectMapping[] = entities.map(
      (entity, index) => {
        const rawRow = raw[index];
        const agressoDescription =
          rawRow?.ac_description ??
          rawRow?.ac_projectDescription ??
          rawRow?.description ??
          rawRow?.projectDescription ??
          (entity as any).agresso_description ??
          null;

        const clarisaFullName =
          clarisaNameMap.get(entity.clarisa_project_id) ??
          (entity as any).clarisa_project_full_name ??
          null;

        return {
          ...entity,
          agresso_description: agressoDescription,
          clarisa_project_full_name: clarisaFullName,
        } as EnrichedBilateralProjectMapping;
      },
    );

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findById(id: number): Promise<BilateralProjectMapping> {
    return this.loadCurrentYearRow(id);
  }

  /**
   * Lookup helper used by BilateralService.getScienceProgramsForResult (T-15.11).
   * Returns the active current-year mapping for the given AGRESSO agreement_id,
   * or null. Uniqueness is one row per (agreement, reporting_year).
   */
  async findActiveByAgreementId(
    agreementId: string,
  ): Promise<BilateralProjectMapping | null> {
    if (!agreementId?.trim()) return null;
    const reportingYear = await this.reportingYearResolver.resolve();
    return this.repo.findOne({
      where: {
        agresso_agreement_id: agreementId.trim(),
        is_active: true,
        reporting_year: reportingYear,
      },
      order: { updated_at: 'DESC' },
    });
  }

  async create(
    dto: CreateBilateralProjectMappingDto,
    user: User,
  ): Promise<BilateralProjectMappingUpsertResult> {
    try {
      return await this.writeUpsert(dto, user);
    } catch (error) {
      if (!isRetryableMysql(error)) throw error;
      this.logger._warn(
        `bilateral mapping upsert retry after MySQL errno ${mysqlErrno(error)}`,
      );
      try {
        return await this.writeUpsert(dto, user);
      } catch (retryError) {
        if (!isRetryableMysql(retryError)) throw retryError;
        const mapped = sqlErrorsHelper({ errno: mysqlErrno(retryError) });
        throw new HttpException(mapped.message, mapped.status);
      }
    }
  }

  async update(
    id: number,
    dto: UpdateBilateralProjectMappingDto,
    user: User,
  ): Promise<BilateralProjectMapping> {
    const row = await this.loadCurrentYearRow(id);
    const actorUserId = user.sec_user_id;

    await this.applyClarisaProjectChange(row, dto);
    if (dto.confidence_score !== undefined) {
      row.confidence_score = dto.confidence_score;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes;
    }
    row.updated_by = actorUserId;

    return this.repo.save(row);
  }

  async deactivate(
    id: number,
    user: User,
    justification?: string,
    notes?: string,
  ): Promise<BilateralProjectMapping> {
    const row = await this.loadCurrentYearRow(id);
    const writeJustification = justification !== undefined;
    const writeNotes = notes !== undefined;
    if (row.is_active === false) {
      if (!writeJustification && !writeNotes) {
        // Idempotent — already deactivated, nothing to record.
        return row;
      }
      if (writeJustification) {
        row.status_justification = justification;
      }
      if (writeNotes) {
        row.notes = notes;
      }
      row.updated_by = user.sec_user_id;
      return this.repo.save(row);
    }
    row.is_active = false;
    row.deleted_at = new Date();
    row.updated_by = user.sec_user_id;
    if (writeJustification) {
      row.status_justification = justification;
    }
    if (writeNotes) {
      row.notes = notes;
    }
    return this.repo.save(row);
  }

  async activate(
    id: number,
    user: User,
    notes?: string,
    clarisaProjectId?: number,
    justification?: string,
  ): Promise<BilateralProjectMapping> {
    const row = await this.loadCurrentYearRow(id);
    const projectDiffers =
      clarisaProjectId !== undefined &&
      clarisaProjectId !== row.clarisa_project_id;
    const trimmedJustification =
      typeof justification === 'string' ? justification.trim() : undefined;
    const writeJustification =
      trimmedJustification !== undefined && trimmedJustification.length > 0;
    if (row.is_active === true) {
      if (notes === undefined && !projectDiffers && !writeJustification) {
        return row;
      }
      if (notes !== undefined) {
        row.notes = notes;
      }
      if (writeJustification) {
        row.status_justification = trimmedJustification;
      }
      if (projectDiffers) {
        await this.applyClarisaProjectChange(row, {
          clarisa_project_id: clarisaProjectId,
        });
      }
      row.updated_by = user.sec_user_id;
      return this.repo.save(row);
    }
    row.is_active = true;
    row.deleted_at = null;
    row.updated_by = user.sec_user_id;
    if (notes !== undefined) {
      row.notes = notes;
    }
    if (writeJustification) {
      row.status_justification = trimmedJustification;
    }
    if (projectDiffers) {
      await this.applyClarisaProjectChange(row, {
        clarisa_project_id: clarisaProjectId,
      });
    }
    return this.repo.save(row);
  }

  /**
   * Project-change half of update(). A supplied short name is copied; a
   * changed clarisa_project_id refreshes clarisa_external_code from CLARISA.
   * Source becomes MANUAL on every call, matching update() (R-APM-006 AC.5).
   * Activate calls this only when the supplied project id differs.
   */
  private async applyClarisaProjectChange(
    row: BilateralProjectMapping,
    dto: {
      clarisa_project_id?: number;
      clarisa_project_short_name?: string;
    },
  ): Promise<void> {
    const previousProjectId = row.clarisa_project_id;
    if (dto.clarisa_project_id !== undefined) {
      row.clarisa_project_id = dto.clarisa_project_id;
    }
    if (dto.clarisa_project_short_name !== undefined) {
      row.clarisa_project_short_name = dto.clarisa_project_short_name;
    }
    const projectChanged =
      dto.clarisa_project_id !== undefined &&
      dto.clarisa_project_id !== previousProjectId;
    if (projectChanged) {
      row.clarisa_external_code = await this.externalCodeFor(
        dto.clarisa_project_id as number,
      );
    }
    // Every human PATCH stores MANUAL. A submitted source is ignored
    // (R-APM-006 AC.5), whether or not the project changed.
    row.source = MappingSourceEnum.MANUAL;
  }

  private async loadCurrentYearRow(
    id: number,
  ): Promise<BilateralProjectMapping> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Bilateral project mapping not found');
    }
    const reportingYear = await this.reportingYearResolver.resolve();
    if (row.reporting_year !== reportingYear) {
      throw new NotFoundException('Bilateral project mapping not found');
    }
    return row;
  }

  private async writeUpsert(
    dto: CreateBilateralProjectMappingDto,
    user: User,
  ): Promise<BilateralProjectMappingUpsertResult> {
    const actorUserId = user.sec_user_id;
    const agreementId = dto.agresso_agreement_id.trim();
    const reportingYear = await this.reportingYearResolver.resolve();

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(BilateralProjectMapping);
      const existing = await txRepo
        .createQueryBuilder('bpm')
        .setLock('pessimistic_write')
        .where('bpm.agresso_agreement_id = :id', { id: agreementId })
        .andWhere('bpm.reporting_year = :reportingYear', { reportingYear })
        .getOne();

      if (!existing) {
        const row = txRepo.create({
          agresso_agreement_id: agreementId,
          reporting_year: reportingYear,
          clarisa_project_id: dto.clarisa_project_id,
          clarisa_project_short_name: dto.clarisa_project_short_name ?? null,
          clarisa_external_code: await this.externalCodeFor(
            dto.clarisa_project_id,
          ),
          // A person submitted this insert. A submitted source is ignored
          // (R-APM-006 AC.5).
          source: MappingSourceEnum.MANUAL,
          confidence_score: dto.confidence_score ?? null,
          notes: dto.notes ?? null,
          is_active: true,
          created_by: actorUserId,
          updated_by: actorUserId,
        });
        const saved = await txRepo.save(row);
        return { ...saved, outcome: 'created' };
      }

      const projectChanged =
        existing.clarisa_project_id !== dto.clarisa_project_id;
      existing.clarisa_project_id = dto.clarisa_project_id;
      if (dto.clarisa_project_short_name !== undefined) {
        existing.clarisa_project_short_name = dto.clarisa_project_short_name;
      }
      // A person submitted this branch, including a resubmit of the same
      // project. Submitted source is ignored (FB-1).
      existing.source = MappingSourceEnum.MANUAL;
      if (projectChanged) {
        existing.clarisa_external_code = await this.externalCodeFor(
          dto.clarisa_project_id,
        );
      }
      if (dto.confidence_score !== undefined) {
        existing.confidence_score = dto.confidence_score;
      }
      if (dto.notes !== undefined) {
        existing.notes = dto.notes;
      }
      existing.updated_by = actorUserId;
      const saved = await txRepo.save(existing);
      return { ...saved, outcome: 'updated' };
    });
  }

  private async externalCodeFor(projectId: number): Promise<string | null> {
    try {
      const project =
        await this.clarisaProjectsService.findProjectById(projectId);
      if (!project) return null;
      const normalized = normalizeExternalCode(
        project.external_code,
      ).normalized;
      return normalized || null;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger._warn(
        `CLARISA feed error while refreshing clarisa_external_code for project ${projectId}: ${detail}`,
      );
      return null;
    }
  }
}
