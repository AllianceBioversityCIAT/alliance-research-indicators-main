import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { DeliveryModality } from './entities/delivery-modality.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class DeliveryModalitiesService extends ControlListBaseService<
  DeliveryModality,
  Repository<DeliveryModality>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      DeliveryModality,
      dataSource.getRepository(DeliveryModality),
      currentUser,
    );
  }

  // H47 — the AI reports "IN PERSON" while the catalog says "In-person", and the
  // base LIKE '%name%' lookup cannot bridge the hyphen, so the extracted modality
  // was dropped. Fall back to a match that ignores case, spaces and punctuation.
  async findByName(name: string): Promise<DeliveryModality> {
    const exact = await super.findByName(name);
    if (exact || !name?.trim()) return exact;
    const wanted = this.looseKey(name);
    const all = await this.findAll();
    return all.find((m) => this.looseKey(m.name) === wanted) ?? null;
  }

  private looseKey(value: string): string {
    return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
