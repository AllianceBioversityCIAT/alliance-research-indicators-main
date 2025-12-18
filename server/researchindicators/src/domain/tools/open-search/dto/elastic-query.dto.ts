// Defines sorting options for properties of type T
export type TypeSort<T> = {
  [K in keyof T]?: SortOptions;
};

export type SortOptions = {
  order: 'asc' | 'desc';
};

// Combines sorting options with an optional _score property
export type OpenSearchSort<T> = { _score?: SortOptions } & TypeSort<T>;

// Defines a multi-match query for OpenSearch
export type OpenSearchMultiMatch<T> = {
  query: string;
  fields: (keyof T)[];
  operator: 'and' | 'or'; // Updated to be more restrictive
};

// Defines a wildcard query where each field maps to a string
export type OpenSearchWildcard<T> = {
  [K in keyof T]?: string;
};

// Defines a Terms query where each field maps to a string
export type OpenSearchTerms<T> = {
  [K in keyof T]?: string;
};

// Defines OpenSearch boolean query with must and should clauses
export type OpenSearchBool<T> = {
  must?: (OpenSearchQuery<T> | OpenSearchOperator<T>)[];
  should?: (OpenSearchQuery<T> | OpenSearchOperator<T>)[];
  filter?: (OpenSearchQuery<T> | OpenSearchOperator<T>)[];
};

// Defines various OpenSearch operators, combining multi-match and wildcard queries with boolean logic
export type OpenSearchOperator<T> = {
  multi_match?: OpenSearchMultiMatch<T>;
  wildcard?: OpenSearchWildcard<T>;
  term?: OpenSearchTerms<T>;
};

// Defines an OpenSearch query that includes boolean logic and other operators
export type OpenSearchQuery<T> = {
  bool?: OpenSearchBool<T>;
  match_all?: {};
} & OpenSearchOperator<T>;

// Defines an Elastic query including sorting options
export type ElasticQueryDto<T> = {
  size: number;
  from?: number;
  query: OpenSearchQuery<T>;
  sort: OpenSearchSort<T>[];
};
