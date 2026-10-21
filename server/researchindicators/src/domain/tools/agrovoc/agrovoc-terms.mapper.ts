import { AgrovocTermDto, AgrovocUpstreamResult } from './dto/agrovoc-term.dto';

const MAX_TERMS = 20;

/**
 * Pure rank / dedupe / cut. Rank is case-insensitive against `query`:
 * 0 exact label, 1 label starts with it, 2 a word starts with it, 3 the rest.
 * A prefLabel hit (no altLabel) wins over synonym rows for the same uri.
 */
export function mapAgrovocTerms(
  rows: AgrovocUpstreamResult[] | null | undefined,
  query: string,
): AgrovocTermDto[] {
  if (!rows?.length) {
    return [];
  }

  const q = query.trim().toLowerCase();
  const byUri = new Map<string, AgrovocTermDto>();

  for (const row of rows) {
    const uri = row.uri?.trim();
    const label = row.prefLabel?.trim();
    if (!uri || !label) {
      continue;
    }

    const altLabel = row.altLabel?.trim();
    const prefLabelHit = !altLabel;
    const existing = byUri.get(uri);

    if (!existing || prefLabelHit) {
      byUri.set(uri, toTerm(uri, label, prefLabelHit ? undefined : altLabel));
    }
  }

  return [...byUri.values()]
    .sort((left, right) => {
      const byRank = rank(left.label, q) - rank(right.label, q);
      if (byRank !== 0) {
        return byRank;
      }
      return left.label.localeCompare(right.label, 'en', {
        sensitivity: 'base',
      });
    })
    .slice(0, MAX_TERMS);
}

function toTerm(
  uri: string,
  label: string,
  matchedLabel: string | undefined,
): AgrovocTermDto {
  if (!matchedLabel) {
    return { uri, label };
  }
  return { uri, label, matched_label: matchedLabel };
}

function rank(label: string, query: string): number {
  const normalized = label.toLowerCase();
  if (normalized === query) {
    return 0;
  }
  if (normalized.startsWith(query)) {
    return 1;
  }
  if (normalized.split(/\s+/).some((word) => word.startsWith(query))) {
    return 2;
  }
  return 3;
}
