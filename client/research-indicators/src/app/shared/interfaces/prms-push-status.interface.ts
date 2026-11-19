export type PrmsPushStatusValue = 'never_pushed' | 'pending_review' | 'approved' | 'rejected';

export interface PrmsPushStatus {
  year: number;
  status: PrmsPushStatusValue;
  resubmittable: boolean;
}

export interface PrmsPushStatusResponse {
  push_status: PrmsPushStatus;
}
