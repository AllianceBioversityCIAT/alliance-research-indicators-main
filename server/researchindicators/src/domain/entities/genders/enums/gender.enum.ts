/**
 * Seeded `gender` catalogue. Verified against Dev on 2026-09-16:
 * 1 Male · 2 Female · 3 Non-binary.
 *
 * Used by the PRMS capacity-sharing builder to place an individual training's
 * single trainee in the right `number_people_trained` bucket, so the ids are
 * never written as literals at the call site.
 */
export enum GenderEnum {
  MALE = 1,
  FEMALE = 2,
  NON_BINARY = 3,
}
