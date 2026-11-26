import { DataSource } from 'typeorm';
import { OicrCatalogsService } from './oicr-catalogs.service';
import { OicrAudience } from './entities/oicr-audience.entity';
import { OicrThematicKeyword } from './entities/oicr-thematic-keyword.entity';
import { QuantificationUnitCategory } from './entities/quantification-unit-category.entity';

describe('OicrCatalogsService', () => {
  const find = jest.fn();
  const getRepository = jest.fn().mockReturnValue({ find });
  const service = new OicrCatalogsService({
    getRepository,
  } as unknown as DataSource);

  beforeEach(() => {
    jest.clearAllMocks();
    getRepository.mockReturnValue({ find });
  });

  it('reads active audiences ordered by id', async () => {
    find.mockResolvedValue([{ id: 1, name: 'Research' }]);
    await expect(service.findAudiences()).resolves.toEqual([
      { id: 1, name: 'Research' },
    ]);
    expect(getRepository).toHaveBeenCalledWith(OicrAudience);
    expect(find).toHaveBeenCalledWith({
      select: { id: true, name: true },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  });

  it('reads active thematic keywords ordered by id', async () => {
    find.mockResolvedValue([]);
    await service.findThematicKeywords();
    expect(getRepository).toHaveBeenCalledWith(OicrThematicKeyword);
    expect(find).toHaveBeenCalledWith({
      select: { id: true, name: true },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  });

  it('reads active quantification unit categories with the percentage flag', async () => {
    find.mockResolvedValue([]);
    await service.findQuantificationUnitCategories();
    expect(getRepository).toHaveBeenCalledWith(QuantificationUnitCategory);
    expect(find).toHaveBeenCalledWith({
      select: {
        id: true,
        macro_category: true,
        name: true,
        is_percentage: true,
      },
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  });
});
