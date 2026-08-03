export interface ImpactArea {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  name: string;
  description: string;
  financialCode: string;
  icon: string;
  color: string;
}

export interface ImpactAreaGlobalTarget {
  value: number | null;
}

export interface ResultImpactAreaGlobalTargetRef {
  global_target_id: number;
}

export interface ResultImpactArea {
  impact_area_id: number;
  impact_area_score_id: number | undefined;
  result_impact_area_global_targets?: ResultImpactAreaGlobalTargetRef[];
}

export interface ImpactAreasBody {
  result_impact_areas?: ResultImpactArea[];
}

export interface BaseService {
  list: () => ImpactArea[];
  loading: () => boolean;
}
