// Visual-only checks: rendered as green checks in the UI but excluded from
// every completeness computation (findByResultId AND the submit gate in
// result-status-workflow/function-handler.service.ts). Optional sections
// must never block submit.
export const VISUAL_ONLY_GREEN_CHECKS: ReadonlySet<string> = new Set([
  'pool_funding_alignment',
]);

export class FindGreenChecksDto {
  public general_information: boolean;
  public alignment: boolean;
  public geo_location: boolean;
  public partners: boolean;
  public evidences: boolean;
  public cap_sharing?: boolean;
  public policy_change?: boolean;
  // Visual-only check: excluded from `completness`, never gates submit.
  public pool_funding_alignment?: boolean;
  public completness?: boolean;
}
