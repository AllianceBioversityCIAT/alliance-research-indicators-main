// @akili-spec results/oicr-word-template-2026

/** One research-area row, in STAR order (`result_lever_id`). */
export interface OicrWordTemplateAreaRow {
  leverId: number | null;
  isPrimary: boolean;
  customName: string | null;
}

/** UN M49 code already coerced with `Number()` from the bigint column. */
export interface OicrWordTemplateRegionRow {
  code: number;
  name: string;
}

export interface OicrWordTemplateCountryRow {
  name: string;
  subNationals: readonly string[];
}

export interface OicrWordTemplateContactRow {
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  center: string | null;
  email: string | null;
}

export interface OicrWordTemplateProjectRow {
  agreementId: string;
  description: string;
}

/**
 * Modal rows for one OICR. Each list is the output of its own query,
 * so a missing source is null or an empty array rather than a joined null.
 */
export interface OicrWordTemplateData {
  reportingYear: string | null;
  title: string | null;
  geoScopeId: number | null;
  geoComment: string | null;
  elaboration: string | null;
  tagId: number | null;
  previousHandle: string | null;
  mainProject: OicrWordTemplateProjectRow | null;
  researchAreas: readonly OicrWordTemplateAreaRow[];
  regions: readonly OicrWordTemplateRegionRow[];
  countries: readonly OicrWordTemplateCountryRow[];
  contact: OicrWordTemplateContactRow | null;
}
