/**
 * Status values for sec_users.status_id.
 *
 * K-005: status is a discriminator — never hardcode the literal value in
 * query conditions; always reference this enum so intent is self-documenting.
 */
export enum UserStatusEnum {
  ACCEPTED = 1,
  PENDING = 2,
  REJECTED = 3,
  EXTERNAL_ACCEPTED = 4,
}
