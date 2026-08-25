/**
 * Copy shape for one chart surface's explainer entry (R-CXP-004, R-CXP-005).
 *
 * `what` / `howToRead` / `source` follow the plain-language sequence mandated by R-CXP-005:
 * what it shows -> how to read it -> data source / caveat. `emptyHint` is an optional fourth
 * line shown only when the surface can render empty (R-CXP-001 empty-chart scenario).
 * `derivedFrom` is the audit trail back to the archived spec section the semantics were
 * checked against (KZ-007) — required on every entry, not just the ones seeded so far.
 */
export interface ChartExplainer {
  title: string;
  what: string;
  howToRead: string;
  source: string;
  emptyHint?: string;
  derivedFrom: string;
}
