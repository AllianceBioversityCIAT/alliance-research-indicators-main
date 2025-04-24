import { IntellectualPropertyOwner } from '../entities/intellectual-property-owner.entity';

export const mapperIntellectualPropertyOwner = (
  data: IntellectualPropertyOwner,
): { id: number; name: string } => ({
  id: data.intellectual_property_owner_id,
  name: data.name,
});
