import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OicrAudience } from './entities/oicr-audience.entity';
import { OicrThematicKeyword } from './entities/oicr-thematic-keyword.entity';
import { QuantificationUnitCategory } from './entities/quantification-unit-category.entity';

@Injectable()
export class OicrCatalogsService {
  constructor(private readonly dataSource: DataSource) {}

  findAudiences(): Promise<Pick<OicrAudience, 'id' | 'name'>[]> {
    return this.dataSource.getRepository(OicrAudience).find({
      select: { id: true, name: true },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  }

  findThematicKeywords(): Promise<Pick<OicrThematicKeyword, 'id' | 'name'>[]> {
    return this.dataSource.getRepository(OicrThematicKeyword).find({
      select: { id: true, name: true },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  }

  findQuantificationUnitCategories(): Promise<
    Pick<
      QuantificationUnitCategory,
      'id' | 'macro_category' | 'name' | 'is_percentage'
    >[]
  > {
    return this.dataSource.getRepository(QuantificationUnitCategory).find({
      select: {
        id: true,
        macro_category: true,
        name: true,
        is_percentage: true,
      },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  }
}
