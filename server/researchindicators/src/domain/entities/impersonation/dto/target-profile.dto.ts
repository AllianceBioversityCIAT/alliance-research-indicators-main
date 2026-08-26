// @akili-spec changes/profile-simulation
import { ApiProperty } from '@nestjs/swagger';
import { TargetProfile } from '../types/impersonation.types';

export class ImpersonationRoleDto {
  @ApiProperty() role_id!: number;
  @ApiProperty() sec_role_id!: number;
  @ApiProperty() focus_id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() is_active!: boolean;
  @ApiProperty({ nullable: true, type: String }) justification_update!:
    | string
    | null;
}

export class ImpersonationUserRoleEntryDto {
  @ApiProperty() is_active!: boolean;
  @ApiProperty() user_id!: number;
  @ApiProperty() role_id!: number;
  @ApiProperty({ type: ImpersonationRoleDto }) role!: ImpersonationRoleDto;
}

/**
 * `TargetProfileDto` (design §4, D-imp-16) — the shape the client stores as
 * `dataCache().user`. Deliberately omits `roleName` (client-computed) and
 * carries no top-level `roles[]` (the middleware/client derive from
 * `user_role_list`).
 *
 * Every `is_active` (top-level, `user_role_list[].is_active` and
 * `user_role_list[].role.is_active`) is coerced from the raw MySQL
 * tinyint(1) 0/1 to a real boolean — `EntityManager.query` / MySQL
 * `JSON_OBJECT` surface tinyints as numbers, not booleans, even though
 * `TargetProfile` is typed with `boolean` at compile time (T-04 review
 * advisory).
 */
export class TargetProfileDto {
  @ApiProperty() sec_user_id!: number;
  @ApiProperty() first_name!: string;
  @ApiProperty() last_name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() is_active!: boolean;
  @ApiProperty() status_id!: number;
  @ApiProperty({ type: [ImpersonationUserRoleEntryDto] })
  user_role_list!: ImpersonationUserRoleEntryDto[];

  static fromProfile(profile: TargetProfile): TargetProfileDto {
    const dto = new TargetProfileDto();
    dto.sec_user_id = profile.sec_user_id;
    dto.first_name = profile.first_name;
    dto.last_name = profile.last_name;
    dto.email = profile.email;
    dto.is_active = Boolean(profile.is_active);
    dto.status_id = profile.status_id;
    dto.user_role_list = (profile.user_role_list ?? []).map((entry) => ({
      is_active: Boolean(entry.is_active),
      user_id: entry.user_id,
      role_id: entry.role_id,
      role: {
        role_id: entry.role.role_id,
        sec_role_id: entry.role.sec_role_id,
        focus_id: entry.role.focus_id,
        name: entry.role.name,
        is_active: Boolean(entry.role.is_active),
        justification_update: entry.role.justification_update,
      },
    }));
    return dto;
  }
}
