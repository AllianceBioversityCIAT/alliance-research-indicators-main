export interface Result {
  id: number;
  title: string;
  indicator: string;
  status: string;
  project: string;
  lever: string;
  year: number;
  result_owner: string;
}

export interface ResultTable {
  attr: string;
  header: string;
}
