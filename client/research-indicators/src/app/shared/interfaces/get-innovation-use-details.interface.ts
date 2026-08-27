// @akili-spec docs/specs/innovation-use/details-page (T-01 — contract layer)
export class GetInnovationUseDetails {
  innovation_use_level_id: number | undefined = undefined;
  /** The resolved scale point, server-derived. Read-only; never sent. */
  innovation_use_level: number | undefined = undefined;
  innovation_use_level_explanation: string | undefined = undefined;
  actors: InnovationUseActor[] = [];
  organizations: InnovationUseOrganization[] = [];
  quantifications: InnovationUseQuantification[] = [];
}

export class InnovationUseActor {
  result_actors_id: number | undefined = undefined;
  actor_type_id: number | undefined = undefined;
  actor_type_custom_name: string | undefined = undefined;
  sex_age_disaggregation_not_apply = false;
  women_youth_count: number | undefined = undefined;
  women_not_youth_count: number | undefined = undefined;
  men_youth_count: number | undefined = undefined;
  men_not_youth_count: number | undefined = undefined;
  actors_count: number | undefined = undefined;
  /** Derived total, read-only, server-computed. Never sent. */
  total: number | undefined = undefined;
}

export class InnovationUseOrganization {
  result_institution_type_id: number | undefined = undefined;
  institution_id: number | undefined = undefined;
  institution_type_id: number | undefined = undefined;
  sub_institution_type_id: number | undefined = undefined;
  institution_type_custom_name: string | undefined = undefined;
  is_organization_known = false;
  organization_count: number | undefined = undefined;
}

export class InnovationUseQuantification {
  id: number | undefined = undefined;
  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-11 — DD-3/DD-15)
  /**
   * Widened from `number | undefined`. That declaration was false before this spec: the driver can
   * hydrate a `DECIMAL` column as either a `number` or a `string` depending on configuration this
   * client does not control. DD-2's entity transformer normalises this to a `number` (or `null`) at
   * the API boundary; this widened type lets the client assert that invariant defensively at the
   * read edge (`quantificationsView`) instead of silently trusting it, following
   * `result-actors.service.ts:377-384`'s stance of never trusting the driver's hydration type by
   * construction. See `innovation-use-details.component.ts:80-85`'s `InnovationUseQuantificationPayload`
   * for the write-side declaration this must be reconciled with (DD-15) — that one stays `number`.
   */
  quantification_number: number | string | undefined = undefined;
  unit: string | undefined = undefined;
  description: string | undefined = undefined;
}
