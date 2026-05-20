import { getMetadataArgsStorage } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Indicator } from './indicator.entity';

describe('Indicator entity metadata', () => {
  it('already inherits the is_active column from AuditableEntity', () => {
    const column = getMetadataArgsStorage().columns.find(
      (metadata) =>
        metadata.target === AuditableEntity &&
        metadata.propertyName === 'is_active',
    );

    expect(new Indicator()).toBeInstanceOf(AuditableEntity);
    expect(column?.options).toMatchObject({
      type: 'boolean',
      name: 'is_active',
      default: true,
      nullable: false,
      select: true,
    });
  });
});
