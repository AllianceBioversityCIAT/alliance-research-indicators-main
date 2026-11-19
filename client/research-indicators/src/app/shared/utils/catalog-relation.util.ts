/**
 * The result GET returns each selected item with its control-list row as a
 * relation (e.g. `lever`, `clarisa_sdg`, `strategic_objective`), and that row is
 * NOT filtered by its own `is_active`. Control lists only offer active options,
 * so the relation is how a selection whose entry was later deactivated can still
 * be shown. These helpers read that relation.
 */

/** Flag set on a selected item whose control-list entry is inactive. */
export interface CatalogStatusFlag {
  is_catalog_inactive?: boolean;
}

/** The relation object under `key`, or undefined when absent or not an object. */
export const catalogRelation = <T extends object>(row: unknown, key: string): T | undefined => {
  if (!row || typeof row !== 'object') return undefined;
  const value = (row as Record<string, unknown>)[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
};

/** True only when the relation says so; a missing relation is not "inactive". MySQL may send 0/'0'. */
export const isCatalogRowInactive = (relation: { is_active?: unknown } | undefined | null): boolean => {
  const value = relation?.is_active;
  return value === false || value === 0 || value === '0' || value === 'false';
};

/** `{ is_catalog_inactive: true }` for an inactive relation, `{}` otherwise — active items keep their shape. */
export const catalogStatus = (relation: { is_active?: unknown } | undefined | null): CatalogStatusFlag =>
  isCatalogRowInactive(relation) ? { is_catalog_inactive: true } : {};

/** A shallow copy of `row` without the relation, so it is not carried around (or sent back). */
export const withoutRelation = <T extends object>(row: T, key: string): T => {
  if (!(key in row)) return row;
  const copy = { ...row } as Record<string, unknown>;
  delete copy[key];
  return copy as T;
};

/**
 * A catalog row's display fields without its own `is_active`, so spreading it onto a
 * selection never overwrites the selection's `is_active` with the catalog's.
 */
export const catalogDisplayFields = <T extends object>(row: T): Omit<T, 'is_active'> => withoutRelation(row, 'is_active') as Omit<T, 'is_active'>;
