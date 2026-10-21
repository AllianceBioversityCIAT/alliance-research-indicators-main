/**
 * The ONE place that says which colour a CGIAR Portfolio mapping status or a PRMS status
 * is drawn in. The monitor (table badges, quick views, KPI cards, coverage charts, legends)
 * and the result sidebar (PRMS sync card and sync-history modal) all read from here, so the
 * same status never looks different on two screens. Values are tokens defined in
 * styles/colors.scss (light + dark); never a hex literal and never a local re-pick
 * (client CLAUDE.md rule).
 *
 * One distinct hue per state, never two tones of one hue; green is reserved for done,
 * red for "needs attention" / rejected. `fg` is for text and outlines (>= 4.5:1 on the
 * surface), `fill` for bars and dots (>= 3:1).
 */
export const PFM_STATE = {
  /** Not started (mapping pending). */
  todo: { fg: 'var(--ac-state-todo-fg)', fill: 'var(--ac-state-todo-fill)' },
  /** Started, not finished (mapping incomplete). */
  progress: { fg: 'var(--ac-state-progress-fg)', fill: 'var(--ac-state-progress-fill)' },
  /** Our part is finished, not sent yet (mapping complete / ready to sync). */
  ready: { fg: 'var(--ac-state-ready-fg)', fill: 'var(--ac-state-ready-fill)' },
  /** Waiting on PRMS (pending review). */
  waiting: { fg: 'var(--ac-state-waiting-fg)', fill: 'var(--ac-state-waiting-fill)' },
  /** Done: synced to PRMS / approved / completed. */
  done: { fg: 'var(--ac-state-done-fg)', fill: 'var(--ac-state-done-fill)' },
  /** Needs attention / rejected by PRMS. */
  alert: { fg: 'var(--ac-state-alert-fg)', fill: 'var(--ac-state-alert-fill)' },
  /** Out of scope (declared no Science Program contribution). */
  out: { fg: 'var(--ac-state-out-fg)', fill: 'var(--ac-state-out-fill)' }
} as const;

export type PfmStateKey = keyof typeof PFM_STATE;

/** 'Nothing yet' track of a progress bar: deliberately not a state colour. */
export const PFM_STATE_EMPTY = 'var(--ac-state-empty)';

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
