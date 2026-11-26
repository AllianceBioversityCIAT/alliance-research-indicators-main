import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultOicrAnnex } from './entities/result-oicr-annex.entity';
import {
  OICR_ANNEX_FILE_TYPES,
  OICR_ANNEX_PARTNER_CONSENTS,
  OicrAnnexTypeEnum,
} from './enums/oicr-annex-type.enum';

@Injectable()
export class ResultOicrAnnexesService extends BaseServiceSimple<
  ResultOicrAnnex,
  Repository<ResultOicrAnnex>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultOicrAnnex,
      dataSource.getRepository(ResultOicrAnnex),
      'result_id',
      currentUser,
    );
  }

  /** Active annexes of a result, ordered by id. Always an array. */
  async findByResult(resultId: number): Promise<ResultOicrAnnex[]> {
    return this.mainRepo.find({
      where: { result_id: resultId, is_active: true },
      order: { id: 'ASC' },
    });
  }

  /**
   * Validates the incoming annexes (400) and returns them normalised: fields
   * that do not belong to the annex type are null. Empty required fields are
   * NOT rejected (the screen saves drafts).
   */
  validateAndNormalize(annexes: unknown): Partial<ResultOicrAnnex>[] {
    if (!Array.isArray(annexes)) {
      throw new BadRequestException('annexes must be an array');
    }
    const types = Object.values(OicrAnnexTypeEnum).filter(
      (v) => typeof v === 'number',
    );
    return annexes.map((raw: Partial<ResultOicrAnnex>, index) => {
      const type = Number(raw?.annex_type_id);
      if (!types.includes(type)) {
        throw new BadRequestException(
          `annexes[${index}].annex_type_id must be one of 1, 2, 3`,
        );
      }
      const isType2 = type === OicrAnnexTypeEnum.MAPS_FIGURES_TABLES_GRAPHS;
      const isType3 = type === OicrAnnexTypeEnum.PARTNERS_LOGOS;
      const fileType = isType2 ? (raw.file_type ?? null) : null;
      const consent = isType3 ? (raw.partner_consent ?? null) : null;
      if (
        fileType !== null &&
        fileType !== '' &&
        !OICR_ANNEX_FILE_TYPES.includes(fileType)
      ) {
        throw new BadRequestException(
          `annexes[${index}].file_type must be one of ${OICR_ANNEX_FILE_TYPES.join(', ')}`,
        );
      }
      if (
        consent !== null &&
        consent !== '' &&
        !OICR_ANNEX_PARTNER_CONSENTS.includes(consent)
      ) {
        throw new BadRequestException(
          `annexes[${index}].partner_consent must be one of ${OICR_ANNEX_PARTNER_CONSENTS.join(', ')}`,
        );
      }
      return {
        id: raw.id,
        annex_type_id: type,
        description: raw.description ?? null,
        photo_credits:
          type === OicrAnnexTypeEnum.PHOTOS
            ? (raw.photo_credits ?? null)
            : null,
        file_type: fileType || null,
        partner_consent: consent || null,
        link: raw.link ?? null,
      };
    });
  }

  /**
   * Replaces the stored annexes of the result with the given set: rows with a
   * known id are updated, rows without id are inserted, stored rows not sent
   * are deactivated.
   */
  async replace(
    resultId: number,
    annexes: Partial<ResultOicrAnnex>[],
    manager?: EntityManager,
  ): Promise<ResultOicrAnnex[]> {
    const rows = this.validateAndNormalize(annexes);
    const repo = selectManager<ResultOicrAnnex, Repository<ResultOicrAnnex>>(
      manager,
      ResultOicrAnnex,
      this.mainRepo,
    );
    const stored = await repo.find({
      where: { result_id: resultId, is_active: true },
    });
    const storedIds = new Set(stored.map((row) => Number(row.id)));
    const sentIds = new Set(
      rows.filter((r) => storedIds.has(Number(r.id))).map((r) => Number(r.id)),
    );

    const toDeactivate = stored
      .filter((row) => !sentIds.has(Number(row.id)))
      .map((row) => row.id);
    if (toDeactivate.length) {
      await repo
        .createQueryBuilder()
        .update(ResultOicrAnnex)
        .set({
          is_active: false,
          ...this.currentUser.audit(SetAuditEnum.UPDATE),
        } as never)
        .whereInIds(toDeactivate)
        .execute();
    }

    const toSave = rows.map((row) => {
      const exists = storedIds.has(Number(row.id));
      return {
        ...row,
        id: exists ? row.id : undefined,
        result_id: resultId,
        is_active: true,
        ...this.currentUser.audit(
          exists ? SetAuditEnum.UPDATE : SetAuditEnum.BOTH,
        ),
      };
    });
    if (!toSave.length) return [];
    return repo.save(toSave as ResultOicrAnnex[]);
  }
}
