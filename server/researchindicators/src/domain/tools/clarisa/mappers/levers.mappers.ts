import { DeepPartial } from 'typeorm';
import { ClarisaLeversRawDto } from '../entities/clarisa-levers/dto/clarisa-levers-raw.dto';
import { ClarisaLever } from '../entities/clarisa-levers/entities/clarisa-lever.entity';

export const leversMappers = (
  data: ClarisaLeversRawDto,
): DeepPartial<ClarisaLever> => {
  const partitions = data.full_name?.split(/\d{1,5}: /)[1];
  return {
    id: data.id,
    short_name: data.short_name,
    full_name: data.full_name,
    other_names: partitions,
  };
};
