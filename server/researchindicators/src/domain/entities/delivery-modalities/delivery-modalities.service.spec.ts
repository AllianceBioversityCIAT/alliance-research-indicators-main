import { DataSource } from 'typeorm';
import { DeliveryModalitiesService } from './delivery-modalities.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('DeliveryModalitiesService.findByName', () => {
  const catalog = [
    { delivery_modality_id: 1, name: 'Virtual' },
    { delivery_modality_id: 2, name: 'Hybrid' },
    { delivery_modality_id: 3, name: 'In-person' },
  ];
  let repo: { findOne: jest.Mock; find: jest.Mock; metadata: unknown };
  let service: DeliveryModalitiesService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue(catalog),
      metadata: { primaryColumns: [{ propertyName: 'delivery_modality_id' }] },
    };
    const dataSource = {
      getRepository: () => repo,
    } as unknown as DataSource;
    service = new DeliveryModalitiesService(dataSource, {} as CurrentUserUtil);
  });

  it('keeps the LIKE match when it finds the modality', async () => {
    repo.findOne.mockResolvedValue(catalog[0]);
    await expect(service.findByName('Virtual')).resolves.toBe(catalog[0]);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it.each(['IN PERSON', 'in person', 'In-Person', 'inperson'])(
    'H47: matches the AI value %p to In-person',
    async (name) => {
      await expect(service.findByName(name)).resolves.toBe(catalog[2]);
    },
  );

  it('returns null for a modality the catalog does not have', async () => {
    await expect(service.findByName('Self-paced')).resolves.toBeNull();
  });

  it('does not scan the catalog for an empty name', async () => {
    await expect(service.findByName('')).resolves.toBeNull();
    expect(repo.find).not.toHaveBeenCalled();
  });
});
