// @akili-spec changes/profile-simulation
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ImpersonationBlockedReason,
  ImpersonationUserSearchResult,
} from '../types/impersonation.types';

export class ImpersonationUserRoleDto {
  @ApiProperty() role_id!: number;
  @ApiProperty() name!: string;
}

/**
 * R-IMP-001 response row. `is_active` is coerced from the raw MySQL
 * tinyint(1) (surfaced as a JS `0`/`1` through `EntityManager.query`, not a
 * real boolean, despite `ImpersonationUserRow.is_active` being typed
 * `boolean` at compile time) so API consumers always see a real boolean —
 * design §4 / T-04 review advisory.
 */
export class ImpersonationUserDto {
  @ApiProperty() sec_user_id!: number;
  @ApiProperty() first_name!: string;
  @ApiProperty() last_name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() is_active!: boolean;
  @ApiProperty({ type: [ImpersonationUserRoleDto] })
  roles!: ImpersonationUserRoleDto[];
  @ApiProperty() simulable!: boolean;
  @ApiPropertyOptional({
    enum: ['system_admin', 'inactive', 'self'],
    description: 'Present only when simulable=false',
  })
  blocked_reason?: ImpersonationBlockedReason;

  static fromResult(row: ImpersonationUserSearchResult): ImpersonationUserDto {
    const dto = new ImpersonationUserDto();
    dto.sec_user_id = row.sec_user_id;
    dto.first_name = row.first_name;
    dto.last_name = row.last_name;
    dto.email = row.email;
    dto.is_active = Boolean(row.is_active);
    dto.roles = (row.roles ?? []).map((role) => ({
      role_id: role.role_id,
      name: role.name,
    }));
    dto.simulable = row.simulable;
    dto.blocked_reason = row.blocked_reason;
    return dto;
  }
}
