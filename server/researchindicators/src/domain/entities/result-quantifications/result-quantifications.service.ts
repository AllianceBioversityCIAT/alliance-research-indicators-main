import { Injectable } from '@nestjs/common';
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
