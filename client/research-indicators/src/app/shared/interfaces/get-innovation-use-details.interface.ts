// @akili-spec docs/specs/innovation-use/details-page (T-01 — contract layer)
export class GetInnovationUseDetails {
  // @akili-spec docs/specs/innovation-use/link-innovation-dev (T-08 — §4.1 wire contract)
  // Widened from `number | undefined`, mirroring `InnovationUseOrganization.institution_id`:
  // `undefined` is dropped by `JSON.stringify`, so a cleared state must be able to carry an explicit
  // `null` (e.g. when clearing the link via PATCH). Do not narrow to `number | undefined`.
  innovation_dev_result_id: number | null | undefined = undefined;

  // @akili-spec docs/specs/innovation-use/link-innovation-dev (T-08 — §4.1 wire contract)
  // Read-only object returned by GET to hydrate the card without an extra request.
  // Widened to `| null | undefined`: present as `null` when unlinked (never absent on GET response).
  // `platform_code` is a NULLABLE `varchar(50)` on the server (`results.platform_code`). It is a
  // SEPARATE column from `result_official_code` (a `bigint`). They are two columns, never one string.
  // A NULL `platform_code` is real and must be representable — hence `string | null`.
  linked_innovation_dev: { result_id: number; result_official_code: number; title: string; platform_code: string | null } | null | undefined =
    undefined;

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
  // @akili-spec docs/specs/changes/innovation-use-required-fields (T-10 — DD-12)
  // Widened from `number | undefined`, same reason as `sub_institution_type_id` below
  // (DD-5b/T-09): `onKnownToggle` clears the path being left to an explicit `null`, never
  // `undefined` (dropped by `JSON.stringify`) — otherwise toggling back to this field's path
  // before saving would let `buildOrganizationPayload` forward the cleared value verbatim and
  // the key would vanish from the serialized PATCH body, leaving a stale server value in place.
  institution_id: number | null | undefined = undefined;
  institution_type_id: number | null | undefined = undefined;
  // @akili-spec docs/specs/changes/innovation-use-required-fields (T-09 — DD-5b)
  // Widened from `number | undefined`: a type change must clear this to an explicit `null`
  // (never `undefined`, which JSON.stringify drops), or a previously stored sub-type survives
  // on the server after the row is re-saved under a type that no longer has one.
  sub_institution_type_id: number | null | undefined = undefined;
  institution_type_custom_name: string | null | undefined = undefined;
  is_organization_known = false;
  organization_count: number | null | undefined = undefined;
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
