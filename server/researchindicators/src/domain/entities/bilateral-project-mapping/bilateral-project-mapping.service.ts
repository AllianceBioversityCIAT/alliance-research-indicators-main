import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
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

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080 / R-BIL-078
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements — T-BTE-01 / R-BTE-002 / NFR-BTE-003 / DD-1
//
// SINGLETON-SCOPED BY DESIGN — see ../bilateral/bilateral.service.ts header
// and parent design.md §3.4 Constraint A. Do NOT inject CurrentUserUtil or
// ResultsUtil; the User is passed in from the controller.
//
// 409 partial-unique conflict handling: the DB enforces the constraint via
// the `uk_bpm_active_agreement` unique index on the generated column
// `active_agreement_id` (D-PI-9). We additionally do a transactional
// SELECT ... FOR UPDATE inside `create` so the 409 response is deterministic
// and the caller sees a clean error envelope instead of a raw 1062.
@Injectable()
export class BilateralProjectMappingService {
  constructor(
    private readonly repo: BilateralProjectMappingRepository,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly clarisaProjectsService?: ClarisaProjectsService,
  ) {}

  async list(
    query: ListBilateralProjectMappingsQueryDto,
  ): Promise<PaginatedBilateralProjectMappings<EnrichedBilateralProjectMapping>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.repo
      .createQueryBuilder('bpm')
      .leftJoin(
        AgressoContract,
        'ac',
        'ac.agreement_id = bpm.agresso_agreement_id',
      )
      .addSelect(['ac.description', 'ac.projectDescription'])
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

    let clarisaNameMap = new Map<number, string>();
    if (this.clarisaProjectsService) {
      try {
        const clarisaProjects =
          await this.clarisaProjectsService.listBilateralProjects();
        if (clarisaProjects) {
          for (const cp of clarisaProjects) {
            if (cp.id !== undefined && cp.id !== null) {
              clarisaNameMap.set(
                cp.id,
                cp.full_name ?? cp.short_name ?? '',
              );
            }
          }
        }
      } catch {
        // Non-blocking if CLARISA service is temporarily unavailable
      }
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
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Bilateral project mapping not found');
    }
    return row;
  }

  /**
   * Lookup helper used by BilateralService.getScienceProgramsForResult (T-15.11).
   * Returns the active mapping for the given AGRESSO agreement_id, or null.
   *
   * The partial-unique index guarantees AT MOST one active row per contract.
   * If the index were somehow bypassed, this method returns the most-recently-updated
   * row — `findActiveByAgreementId` is implemented as a hot path; logging is
   * deliberately quiet here.
   */
  async findActiveByAgreementId(
    agreementId: string,
  ): Promise<BilateralProjectMapping | null> {
    if (!agreementId?.trim()) return null;
    return this.repo.findOne({
      where: {
        agresso_agreement_id: agreementId.trim(),
        is_active: true,
      },
      order: { updated_at: 'DESC' },
    });
  }

  async create(
    dto: CreateBilateralProjectMappingDto,
    user: User,
  ): Promise<BilateralProjectMapping> {
    const actorUserId = user.sec_user_id;
    const agreementId = dto.agresso_agreement_id.trim();

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(BilateralProjectMapping);

      // Make the conflict response deterministic by checking inside the
      // transaction. The UNIQUE INDEX is the real safety net (per D-PI-9);
      // this SELECT just produces a clean 409 instead of a raw 1062.
      const existingActive = await txRepo
        .createQueryBuilder('bpm')
        .setLock('pessimistic_write')
        .where('bpm.agresso_agreement_id = :id', { id: agreementId })
        .andWhere('bpm.is_active = true')
        .getOne();

      if (existingActive) {
        throw new ConflictException(
          'Active mapping already exists for this contract',
        );
      }

      const row = txRepo.create({
        agresso_agreement_id: agreementId,
        clarisa_project_id: dto.clarisa_project_id,
        clarisa_project_short_name: dto.clarisa_project_short_name ?? null,
        source: dto.source ?? MappingSourceEnum.MANUAL,
        confidence_score: dto.confidence_score ?? null,
        notes: dto.notes ?? null,
        is_active: true,
        created_by: actorUserId,
        updated_by: actorUserId,
      });

      return txRepo.save(row);
    });
  }

  async update(
    id: number,
    dto: UpdateBilateralProjectMappingDto,
    user: User,
  ): Promise<BilateralProjectMapping> {
    const row = await this.findById(id);
    const actorUserId = user.sec_user_id;

    if (dto.clarisa_project_id !== undefined) {
      row.clarisa_project_id = dto.clarisa_project_id;
    }
    if (dto.clarisa_project_short_name !== undefined) {
      row.clarisa_project_short_name = dto.clarisa_project_short_name;
    }
    if (dto.source !== undefined) {
      row.source = dto.source;
    }
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
    notes?: string,
  ): Promise<BilateralProjectMapping> {
    const row = await this.findById(id);
    if (row.is_active === false) {
      // Idempotent — already deactivated.
      return row;
    }
    row.is_active = false;
    row.deleted_at = new Date();
    row.updated_by = user.sec_user_id;
    if (notes !== undefined) {
      row.notes = notes;
    }
    return this.repo.save(row);
  }
}
