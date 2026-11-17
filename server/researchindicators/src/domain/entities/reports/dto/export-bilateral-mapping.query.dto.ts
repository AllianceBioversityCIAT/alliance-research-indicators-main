import { PickType } from '@nestjs/swagger';
import { ListBilateralProjectMappingsQueryDto } from '../../bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto';

// @akili-spec docs/specs/bilateral/mapping-filtered-export — T-04 / R-MFE-001
//
// The list DTO also carries page, limit and is_active. The export accepts
// only the three filters the screen sends (design §4).
export class ExportBilateralMappingQueryDto extends PickType(
  ListBilateralProjectMappingsQueryDto,
  ['search', 'status', 'source'] as const,
) {}
