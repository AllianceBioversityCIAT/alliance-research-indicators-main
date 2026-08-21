/**
 * Pure merge for the `gender_distribution` section (R-IMC-005, design §6.2, DD-2/DD-8).
 *
 * Q2 (`IndicatorMetadataReportsRepository`, T-04) emits gender participation as two
 * independently-shaped row sets, both already bucketed to the uniform
 * `{ id, name, count }` shape by the repository:
 *   - `individualRows` — one row per `gender_id` grouped from individual-format
 *     (`session_format_id = SessionFormatEnum.INDIVIDUAL`) capacity-sharing records.
 *   - `groupRows` — exactly three literal rows (Male=1, Female=2, Non-binary=3),
 *     one per fixed participant column, `SUM`-ed and `COALESCE(...,0)`-d in SQL.
 *
 * This function has **no `DataSource` and no access to the `gender` lookup table** —
 * it only ever sees what it is handed. It merges the two shapes into the single
 * `gender_distribution` section reported to the client.
 *
 * Non-negotiable contract (do not "simplify" this):
 * - The merge is a **symmetric sum over the union of `gender_id`s**. Neither
 *   `individualRows` nor `groupRows` is authoritative over the other. A `gender_id`
 *   present in only one input is carried through to the output **unchanged** — this
 *   is DD-8. Do NOT add a "drop/skip a group row that has no individual counterpart"
 *   rule: because this util has no visibility into `gender` itself, the only thing
 *   such a rule could match a group row against is `individualRows`, which is empty
 *   for a group-only project — so that rule would silently zero out the entire
 *   Gender chart for every group-only project despite real reported participants
 *   (the group-only project measured live: 6,057 male / 31,436 female group
 *   participants against 99 total individual records). Prohibited by design §6.2.
 * - A row's `count` is treated as `0` when it is `null` or `undefined` (AC.2) rather
 *   than being treated as an absent category.
 * - A `gender_id` whose **summed** total is `0` is dropped from the output (AC.3) —
 *   this also keeps an unexpected id invisible unless it carries real data.
 * - The result MUST be re-sorted `count DESC, id ASC` after summing (AC.7).
 *   `gender_distribution` is the one section whose final counts are produced after
 *   SQL, and addition can reorder the ranking a union-level `ORDER BY` already
 *   produced — that ordering cannot reach this section, so this function owns it.
 */

export interface GenderDistributionRow {
  id: number;
  name: string;
  count: number;
}

const toSafeCount = (count: number | null | undefined): number =>
  count == null ? 0 : Number(count);

/**
 * Merges the individual-format and group-format gender participation shapes into
 * the final `gender_distribution` section.
 *
 * @param individualRows rows grouped by `gender_id` from individual-format records
 * @param groupRows the three literal group-participation rows (Male/Female/Non-binary)
 * @returns the merged section, zero-total categories dropped, sorted `count DESC, id ASC`
 */
export function mergeGenderDistribution(
  individualRows: GenderDistributionRow[] = [],
  groupRows: GenderDistributionRow[] = [],
): GenderDistributionRow[] {
  const totalsById = new Map<number, GenderDistributionRow>();

  const accumulate = (
    rows: GenderDistributionRow[] | undefined | null,
  ): void => {
    for (const row of rows ?? []) {
      const count = toSafeCount(row?.count);
      const existing = totalsById.get(row.id);
      if (existing) {
        existing.count += count;
      } else {
        totalsById.set(row.id, { id: row.id, name: row.name, count });
      }
    }
  };

  // Neither input is processed conditionally on the other — this is what makes
  // the merge symmetric. A group-only project (individualRows === []) still
  // accumulates every group row; an individual-only project still accumulates
  // every individual row.
  accumulate(individualRows);
  accumulate(groupRows);

  return Array.from(totalsById.values())
    .filter((row) => row.count > 0)
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.id - b.id));
}
