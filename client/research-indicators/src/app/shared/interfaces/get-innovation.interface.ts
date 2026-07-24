export interface InnovationLevel {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  level: number;
  name: string;
  definition: string;
  additional_guidance: string;
}

export interface InnovationCharacteristic {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  name: string;
  definition: string;
  source_id: number;
}

export interface InnovationType {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  code: number;
  name: string;
  definition: string;
}
