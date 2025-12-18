export class PrmsResponseDto {
  source: string;
  id: number;
  result_code: number;
  result_id: number;
  title: string;
  description: string;
  result_type_id: number;
  result_level_id: number;
  status_id: number;
  reported_year_id: number;
  created_date: Date;
  obj_created: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_cgiar: boolean;
    active: true;
  };
}
