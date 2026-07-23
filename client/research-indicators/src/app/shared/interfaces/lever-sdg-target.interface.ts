export interface ClarisaSdg {
  id: number;
  short_name?: string;
  full_name?: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface LeverSdgTargetApi {
  id: number;
  sdg_target: string;
  sdg_target_code: string;
  clarisa_sdg?: ClarisaSdg;
}

export interface LeverSdgTargetOption extends LeverSdgTargetApi {
  sdg_target_id: number;
  select_label: string;
}

export interface ResultLeverSdgTargetPayload {
  sdg_target_id: number;
}

export interface LeverSdgTargetMapping {
  id: number;
  lever_id: number;
  sdg_target_id: number;
  sdg_target?: string;
  sdg_target_code?: string;
  clarisa_sdg?: ClarisaSdg;
}

export interface LeverSdgTargetNestedListRow {
  id: number;
  lever: { id: number; short_name?: string; full_name?: string };
  sdg_target: { id: number; sdg_target: string; sdg_target_code: string };
}

function toNonNegNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function asOptionalString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function tryParseFlatRow(r: Record<string, unknown>): LeverSdgTargetMapping | null {
  const id = toNonNegNumber(r['id']);
  if (id === null) return null;
  const flatLid = toNonNegNumber(r['lever_id']);
  const flatStid = toNonNegNumber(r['sdg_target_id']);
  if (flatLid === null || flatLid <= 0 || flatStid === null || flatStid <= 0) return null;
  const cs = r['clarisa_sdg'];
  return {
    id,
    lever_id: flatLid,
    sdg_target_id: flatStid,
    sdg_target: asOptionalString(r['sdg_target']),
    sdg_target_code: asOptionalString(r['sdg_target_code']),
    ...(cs && typeof cs === 'object' ? { clarisa_sdg: cs as ClarisaSdg } : {})
  };
}

function tryParseNestedRow(r: Record<string, unknown>, id: number): LeverSdgTargetMapping | null {
  const lever = r['lever'];
  const st = r['sdg_target'];
  if (!lever || typeof lever !== 'object' || !st || typeof st !== 'object') return null;
  const lv = lever as Record<string, unknown>;
  const t = st as Record<string, unknown>;
  const lid = toNonNegNumber(lv['id']);
  const sid = toNonNegNumber(t['id']);
  if (lid === null || lid <= 0 || sid === null || sid <= 0) return null;
  return {
    id,
    lever_id: lid,
    sdg_target_id: sid,
    sdg_target: asOptionalString(t['sdg_target']),
    sdg_target_code: asOptionalString(t['sdg_target_code'])
  };
}

export function normalizeLeverSdgTargetMappingRow(row: unknown): LeverSdgTargetMapping | null {
  if (row == null || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const fromFlat = tryParseFlatRow(r);
  if (fromFlat) return fromFlat;
  const id = toNonNegNumber(r['id']);
  if (id === null) return null;
  return tryParseNestedRow(r, id);
}

export function normalizeLeverSdgTargetMappingList(raw: unknown): LeverSdgTargetMapping[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(row => normalizeLeverSdgTargetMappingRow(row)).filter((m): m is LeverSdgTargetMapping => m != null);
}

export interface PatchLeverSdgTargetsRequest {
  leverSdgTargetList: {
    id: number;
    lever_id: number;
    sdg_target_id: number;
  }[];
}
