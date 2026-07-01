import { LeverIcon } from './enum/LeversIcons.enum';

type ResolveLeverIconInput = {
  shortName?: string | null;
  fullName?: string | null;
  leverId?: number | null;
};

const resolveIconPath = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  return (
    LeverIcon[normalized] ??
    LeverIcon[normalized.match(/^Lever \d+/)?.[0] ?? '']
  );
};

export const resolveLeverIconUrl = (
  bucketUrl: string | undefined,
  input: ResolveLeverIconInput,
): string | null => {
  if (!bucketUrl?.trim()) return null;

  const candidates = [
    input.shortName,
    input.fullName,
    input.leverId != null ? `Lever ${input.leverId}` : null,
  ];

  for (const candidate of candidates) {
    const iconPath = resolveIconPath(candidate);
    if (iconPath) {
      return `${bucketUrl.trim()}/images/levers${iconPath}`;
    }
  }

  return null;
};
