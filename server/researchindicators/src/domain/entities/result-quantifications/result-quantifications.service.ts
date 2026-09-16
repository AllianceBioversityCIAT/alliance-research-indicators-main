import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ResultQuantification } from './entities/result-quantification.entity';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

interface QuantificationData {
  quantification_number: number;
  unit: string;
  description?: string;
}

/**
 * @sdd-spec docs/specs/changes/measure-number-signed-decimal — T-03 / DD-13
 *
 * `DECIMAL(24,4)`'s magnitude bound at scale 4 (design.md DD-14, §6.2):
 * `max = 2^(53 − ⌈log₂(10^4)⌉) − 1`, verified by execution to admit zero
 * round-trip failures — round 2's derivation admitted 3,616 collisions per
 * 20,000 samples near this same bound.
 */
const INNOVATION_USE_QUANTIFICATION_MAX = 549_755_813_887;

@Injectable()
export class ResultQuantificationsService extends BaseServiceSimple<
  ResultQuantification,
  Repository<ResultQuantification>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultQuantification,
      dataSource.getRepository(ResultQuantification),
      'result_id',
      currentUser,
      'quantification_role_id',
    );
  }

  /**
   * @sdd-spec docs/specs/changes/measure-number-signed-decimal — T-03 / DD-13, R-MSD-011
   *
   * Per-role rule map, keyed on the `dataRole` PARAMETER — never on a
   * `quantification_role_id` found on the payload. `update-oicr.dto.ts`
   * types its arrays as the full entity and its controller applies no
   * `ValidationPipe`, so a payload-keyed map would let a client send
   * `quantification_role_id: 3` on an OICR call and buy the permissive
   * rule. The role only ever arrives here as this method's own parameter,
   * attached by `upsertByCompositeKeys`/`create` from their own call-site
   * argument, which the client cannot reach.
   *
   * Default entry (roles 1, 2, and any future role): non-negative integer.
   * This is a restoration of the fraction axis only — `result_quantifications
   * .quantification_number` was `bigint`, which is signed, so refusing a
   * negative here is a genuine tightening (DD-8's correction, RK-14), not a
   * restoration of "today's effective behaviour".
   *
   * Role 3 (Innovation Use): signed, at most 4 decimal places, within
   * DD-14's derived bound.
   *
   * Null contract (R-MSD-011 AC.6): `null`/`undefined` are accepted and
   * skipped by EVERY entry, including the default — `quantification_number`
   * is nullable and DD-2's `null -> null` transform makes this load-bearing
   * for `quantificationRowAbsent`. The two write paths deliver different
   * null shapes (OICR coerces `q.number ?? 0` client-side, L-08, pre-existing
   * and not fixed here; Innovation Use preserves `null`), so the skip below
   * is explicit rather than incidental.
   */
  protected async createCustomValidation(
    dataArray: Partial<ResultQuantification>[],
    dataRole?: QuantificationRolesEnum,
  ): Promise<void> {
    for (const data of dataArray) {
      const value = data.quantification_number;

      if (value === null || value === undefined) {
        continue;
      }

      if (dataRole === QuantificationRolesEnum.INNOVATION_USE) {
        this.validateSignedScaledQuantification(value);
      } else {
        this.validateNonNegativeIntegerQuantification(value);
      }
    }
  }

  private validateNonNegativeIntegerQuantification(value: number): void {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 0
    ) {
      throw new BadRequestException(
        `quantification_number must be a non-negative integer, received ${value}`,
      );
    }
  }

  private validateSignedScaledQuantification(value: number): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(
        `quantification_number must be a finite number, received ${value}`,
      );
    }

    if (Math.abs(value) > INNOVATION_USE_QUANTIFICATION_MAX) {
      throw new BadRequestException(
        `quantification_number must not exceed ${INNOVATION_USE_QUANTIFICATION_MAX} in magnitude, received ${value}`,
      );
    }

    // Round-trip test, not an integrality test: `value * 10000` is
    // non-integral for 12.74% of the 4-decimal grid in [0,20], the region
    // measured, due to binary floating-point representation error (e.g.
    // 0.07 * 10000 === 700.0000000000001; 1.005 * 10000 ===
    // 10049.999999999998), so `Number.isInteger(value * 10000)` falsely
    // rejects values that ARE within the rule. This predicate instead asks
    // whether `value` survives a pass through the 4-decimal grid unchanged
    // — exhaustively verified over every 4-decimal value in [0, 20]
    // (200,001 values): 0 false rejections, vs 25,477 (12.74%) for the
    // integrality test.
    //
    // Vacuous above ~450,359,962,737 (2^52 / 10^4): past that point the
    // double grid is coarser than a 5th decimal, so no value there can
    // carry a genuine 5th-decimal-place violation for this check to catch —
    // left as a note for the next maintainer, not a defect to fix.
    if (Math.round(value * 10000) / 10000 !== value) {
      throw new BadRequestException(
        `quantification_number must have at most 4 decimal places, received ${value}`,
      );
    }
  }

  async upsertQuantificationsByRole(
    resultId: number,
    quantifications: QuantificationData[],
    roleId: number,
  ): Promise<ResultQuantification[]> {
    if (!quantifications || quantifications.length === 0) {
      await this.mainRepo.update(
        {
          result_id: resultId,
          quantification_role_id: roleId,
          is_active: true,
        },
        { is_active: false },
      );
      return [];
    }

    const existingRecords = await this.mainRepo.find({
      where: {
        result_id: resultId,
        quantification_role_id: roleId,
      },
    });

    const generateKey = (item: {
      quantification_number: number;
      unit: string;
      description?: string;
    }) => {
      return `${item.quantification_number}|${item.unit}|${item.description || ''}`;
    };

    const existingMap = new Map<string, ResultQuantification>();
    existingRecords.forEach((record) => {
      const key = generateKey(record);
      existingMap.set(key, record);
    });

    const dataToSave: Partial<ResultQuantification>[] = [];
    const idsToKeepActive: number[] = [];

    for (const item of quantifications) {
      const key = generateKey(item);
      const existing = existingMap.get(key);

      if (existing) {
        dataToSave.push({
          ...existing,
          is_active: true,
        });
        idsToKeepActive.push(existing.id);
      } else {
        dataToSave.push({
          result_id: resultId,
          quantification_role_id: roleId,
          quantification_number: item.quantification_number,
          unit: item.unit,
          description: item.description,
          is_active: true,
        });
      }
    }

    const activeExistingIds = existingRecords
      .filter((r) => r.is_active)
      .map((r) => r.id);

    const idsToDeactivate = activeExistingIds.filter(
      (id) => !idsToKeepActive.includes(id),
    );

    if (idsToDeactivate.length > 0) {
      await this.mainRepo.update(
        {
          id: In(idsToDeactivate),
        },
        { is_active: false },
      );
    }

    const savedRecords = await this.mainRepo.save(dataToSave);

    return savedRecords.filter((r) => r.is_active);
  }

  async findByResultIdAndRoles(
    resultId: number,
    roleIds: QuantificationRolesEnum[],
  ): Promise<ResultQuantification[]> {
    return this.mainRepo.find({
      where: {
        result_id: resultId,
        quantification_role_id: In(roleIds),
        is_active: true,
      },
    });
  }
}
