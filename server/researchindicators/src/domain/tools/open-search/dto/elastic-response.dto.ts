export interface ElasticResponse<T> {
  took: number;
  timed_out: boolean;
  _shards: Shards;
  hits: Hits<T>;
}

export interface Shards {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}

export interface Hits<T> {
  total: Total;
  max_score: any;
  hits: Hit<T>[];
}

export interface Total {
  value: number;
  relation: string;
}

export interface Hit<T> {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
  sort: number[];
}
