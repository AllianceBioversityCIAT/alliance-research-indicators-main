export interface NextStepOption {
  id: number;
  name: string;
  direction?: 'previous' | 'next';
  transition_direction?: 'forward' | 'backward' | 'unknown';
  icon?: 'reject' | 'postpone';
  result_status_id?: number;
  is_status_change_validation_required?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface SequenceItem {
  id: number;
  name: string;
}

export interface GetNextStep {
  data?: NextStepOption[];
  sequence?: SequenceItem[];
  special_transitions?: Record<number, NextStepOption[]>;
  available_statuses?: NextStepOption[];
}
