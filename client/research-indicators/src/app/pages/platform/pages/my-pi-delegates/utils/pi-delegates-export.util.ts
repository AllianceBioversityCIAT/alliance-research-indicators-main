// Helpers shared by the By-project and By-person Excel exports.

export type PiDelegatesExportKind = 'by_project' | 'by_person';

/** STAR_pi_delegates_<kind>_YYYYMMDD_HHMM_<INITIALS>.xlsx (same shape as the Results Center export). */
export function buildPiDelegatesExportFileName(
  kind: PiDelegatesExportKind,
  date: Date,
  user: { first_name?: string | null; last_name?: string | null }
): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyymmdd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const hhmm = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  const first = user.first_name?.trim()?.charAt(0)?.toUpperCase() ?? '';
  const last = user.last_name?.trim()?.charAt(0)?.toUpperCase() ?? '';
  const initials = `${first}${last}` || 'UU';
  return `STAR_pi_delegates_${kind}_${yyyymmdd}_${hhmm}_${initials}.xlsx`;
}

/** Triggers a browser download of `blob` through a temporary object URL. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  }, 100);
}
