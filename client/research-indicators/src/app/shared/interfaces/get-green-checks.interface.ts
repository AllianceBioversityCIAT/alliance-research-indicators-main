export interface GreenChecks {
  general_information?: number;
  alignment?: number;
  geo_location?: number;
  partners?: number;
  evidences?: number;
  policy_change?: number;
  cap_sharing_ip?: number;
  completness?: number;
  link_result?: number;
  innovation_dev?: number;
  oicr?: number;
  // Emitted by the backend green-checks service so the "Pool funding alignment"
  // section shows its completion tick like every other section. The sidebar
  // already reads this key (result-sidebar greenCheckKey: 'pool_funding_alignment').
  pool_funding_alignment?: number;
  // @akili-spec docs/specs/innovation-use/details-page (T-10 — reachability wiring)
  // Emitted by the backend green-checks service for the indicator-6 "Innovation use
  // details" section. The sidebar reads this key (result-sidebar greenCheckKey:
  // 'innovation_use'). Declaring it here (DD-9) closes the type gap that the sidebar's
  // existing indicator-1/2 IP rights rows were already relying on an `as keyof
  // GreenChecks` cast to bridge.
  innovation_use?: number;
  // @akili-spec docs/specs/innovation-use/details-page (T-10 — reachability wiring)
  // Emitted by the backend for the "IP rights" section (result-sidebar greenCheckKey:
  // 'ip_rights'), read by the existing indicator-1/2 rows and now the indicator-6 row too.
  ip_rights?: number;
}
