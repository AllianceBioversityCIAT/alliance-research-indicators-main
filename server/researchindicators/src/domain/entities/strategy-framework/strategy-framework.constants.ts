/**
 * Fixed facts of the module (design 2.1, R-STF-002, R-STF-003, R-STF-004,
 * R-STF-005, I-8).
 *
 * @akili-spec institutional-performance/strategy-framework
 */

/** Staff search returns at most this many active rows (R-STF-004). */
export const STAFF_SEARCH_LIMIT = 20;

/** Any accepted code is 1–30 characters (R-STF-005). */
export const CODE_MAX_LENGTH = 30;

/** A name is required and at most 255 characters (R-STF-003). */
export const NAME_MAX_LENGTH = 255;

/** A portfolio holds at most this many elements (I-8). */
export const MAX_ELEMENTS_PER_PORTFOLIO = 500;

export interface DefaultLevel {
  depth: number;
  name: string;
  plural_name: string;
  short_label: string;
  is_indicator_level: number;
}

/**
 * The full level set inserted on a portfolio's first element (design 5.2
 * step 2, D-STF-21). Plural names are R-STF-002; short labels are design
 * §3.4. The indicator flag sits at depth 3 and does not move in this spec.
 */
export const DEFAULT_LEVELS: readonly DefaultLevel[] = [
  {
    depth: 1,
    name: 'Performance Area',
    plural_name: 'Performance Areas',
    short_label: 'AREA',
    is_indicator_level: 0,
  },
  {
    depth: 2,
    name: 'Dimension',
    plural_name: 'Dimensions',
    short_label: 'DIMENSION',
    is_indicator_level: 0,
  },
  {
    depth: 3,
    name: 'Indicator',
    plural_name: 'Indicators',
    short_label: 'INDICATOR',
    is_indicator_level: 1,
  },
];
