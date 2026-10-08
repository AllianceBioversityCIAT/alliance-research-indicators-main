/** Minimal shape needed to build a link to a result (a subset of `Result`). */
export interface ResultLinkInput {
  platform_code: string;
  result_official_code: number | string;
  result_status_id?: number | null;
  snapshot_years?: number[] | null;
}

export interface ResultLink {
  /** Router commands: `['/result', '<platform>-<code>']`, plus `general-information` for versioned results. */
  commands: string[];
  /** `{ version: <latest snapshot year> }` for approved results with snapshots; empty otherwise. */
  queryParams: Record<string, number>;
}

const APPROVED_STATUS_ID = 6;

/** Results Center link rule: status 6 + non-empty snapshot_years opens the latest snapshot version. */
export function buildResultLink(input: ResultLinkInput): ResultLink {
  const resultCode = `${input.platform_code}-${input.result_official_code}`;
  if (input.result_status_id === APPROVED_STATUS_ID && Array.isArray(input.snapshot_years) && input.snapshot_years.length > 0) {
    return {
      commands: ['/result', resultCode, 'general-information'],
      queryParams: { version: Math.max(...input.snapshot_years) }
    };
  }
  return { commands: ['/result', resultCode], queryParams: {} };
}
