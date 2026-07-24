import { AIAssistantResult } from '@shared/components/all-modals/modals-content/create-result-modal/models/AIAssistantResult';

export interface TextMiningDto {
  bucketName: string;
  key: string;
  token: string;
  prompt?: string;
}

export interface RootAi {
  results: AIAssistantResult[];
}

export interface CountryArea {
  country_code: string;
  areas: string[];
}

export interface ResponseAiDto {
  content: MiningTextItem[];
}

export interface MiningTextItem {
  type: string;
  text: string;
}
