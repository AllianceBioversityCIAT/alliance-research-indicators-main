export function openPublicLink(link: string | null | undefined): void {
  const trimmed = link?.trim();
  if (!trimmed) return;
  globalThis.open(trimmed, '_blank', 'noopener,noreferrer');
}
