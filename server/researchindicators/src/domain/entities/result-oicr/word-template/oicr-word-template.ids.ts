// @akili-spec results/oicr-word-template-2026

/**
 * The 13 target content controls of the 2026 OICR template (`w:id`).
 * This is the only place those ids live.
 */
export const OICR_WORD_TEMPLATE_TARGET_IDS = {
  reportingYear: '-1384245087',
  tagAs: '2132273794',
  previousHandle: '-264317297',
  mainProject: '-1815635536',
  title: '-1191449392',
  raPrimarySection: '-1877842743',
  raOtherSpecifySection: '1015345366',
  raContribSection: '1504627832',
  geoScope: '-547993178',
  regionsCountries: '-504483',
  geoComments: '-515767717',
  elaboration: '1376114886',
  authorsSection: '187950164',
} as const;

/**
 * The 9 pinned leaves inside the four repeating sections.
 * 3.a / 3.b are dropdowns; section 15 role is a combo; the rest are text.
 * Addressed by these ids, never by column position.
 */
export const OICR_WORD_TEMPLATE_LEAF_IDS = {
  raPrimaryDropdown: '-690528354',
  raOtherSpecifyItem: '-187911690',
  raContribDropdown: '1515729450',
  authorName: '1421518631',
  authorPosition: '2120495043',
  authorAffiliation: '626510419',
  authorEmail: '1156341516',
  authorOrcid: '-730922192',
  authorRole: '-1973903463',
} as const;

export type OicrWordTemplateTargetName =
  keyof typeof OICR_WORD_TEMPLATE_TARGET_IDS;

export type OicrWordTemplateLeafName = keyof typeof OICR_WORD_TEMPLATE_LEAF_IDS;
