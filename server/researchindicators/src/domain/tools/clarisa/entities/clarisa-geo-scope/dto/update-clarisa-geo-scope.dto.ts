import { PartialType } from '@nestjs/swagger';
import { CreateClarisaGeoScopeDto } from './create-clarisa-geo-scope.dto';

export class UpdateClarisaGeoScopeDto extends PartialType(
  CreateClarisaGeoScopeDto,
) {}
