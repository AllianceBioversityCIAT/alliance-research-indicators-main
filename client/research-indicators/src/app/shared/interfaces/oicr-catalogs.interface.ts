export interface OicrCatalogItem {
  id: number;
  name: string;
}

export interface OicrAudienceOption extends OicrCatalogItem {
  /** Same value as `id`, under the key the saved selection uses (`audiences[].oicr_audience_id`). */
  oicr_audience_id: number;
}

export interface OicrThematicKeywordOption extends OicrCatalogItem {
  /** Same value as `id`, under the key the saved selection uses (`thematic_keywords[].oicr_thematic_keyword_id`). */
  oicr_thematic_keyword_id: number;
}

export interface QuantificationUnitCategory {
  id: number;
  macro_category: string;
  name: string;
  is_percentage: boolean;
}
