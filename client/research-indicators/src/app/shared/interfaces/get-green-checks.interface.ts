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
}
