/**
 * The ONE place that says which colour a CGIAR Portfolio mapping status or a PRMS status
 * is drawn in. The monitor table (mapping + PRMS cells, legend) and the result sidebar
 * (PRMS sync card and sync-history modal) all read from here, so the same status never
 * looks different on two screens. Values are tokens defined in styles/colors.scss
 * (light + dark); never a hex literal and never a local re-pick (client CLAUDE.md rule).
 */

/** PRMS review status (monitor `prms_status`, sidebar sync pill). */
export const PRMS_STATUS_COLOR = {
  pending: 'var(--ac-status-prms-pending)',
  approved: 'var(--ac-status-prms-approved)',
  rejected: 'var(--ac-status-prms-rejected)'
} as const;

/** CGIAR Portfolio mapping status, keyed by the wire value of `mapping_state`. */
export const MAPPING_STATUS_COLOR = {
  Pending: 'var(--ac-status-mapping-pending)',
  Incomplete: 'var(--ac-status-mapping-incomplete)',
  Complete: 'var(--ac-status-mapping-complete)',
  'No SP contribution': 'var(--ac-status-mapping-no-sp)'
} as const;
