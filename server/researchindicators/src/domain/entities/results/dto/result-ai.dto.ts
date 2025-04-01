import { UpdateResultCapacitySharingDto } from '../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultDto } from './create-result.dto';
import { SaveGeoLocationDto } from './save-geo-location.dto';
import { UpdateGeneralInformation } from './update-general-information.dto';

export class ResultAiDto {
  result: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  geoScope: SaveGeoLocationDto;
  capSharing: UpdateResultCapacitySharingDto;
}

export class RootAi {
  results: ResultRawAi[];
}

export class ResultRawAi {
  indicator: string;
  title: string;
  description: string;
  keywords: string[];
  geoscope: GeoscopeRawAi;
  training_type: string;
  total_participants: number;
  male_participants: any;
  female_participants: any;
  non_binary_participants: string;
  training_modality: string;
  start_date: string;
  end_date: string;
  length_of_training: string;
  alliance_main_contact_person_first_name: string;
  alliance_main_contact_person_last_name: string;
}

export class GeoscopeRawAi {
  level: string;
  sub_list?: string[];
}
