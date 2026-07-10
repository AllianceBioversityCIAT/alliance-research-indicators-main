import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { CreateResultEvidenceDto } from '../../../entities/result-evidences/dto/create-result-evidence.dto';
import { ResultKnowledgeProduct } from '../../../entities/result-knowledge-product/entities/result-knowledge-product.entity';
import { CreateResultDto } from '../../../entities/results/dto/create-result.dto';
import { ResultAlignmentDto } from '../../../entities/results/dto/result-alignment.dto';
import { SaveGeoLocationDto } from '../../../entities/results/dto/save-geo-location.dto';
import { UpdateGeneralInformation } from '../../../entities/results/dto/update-general-information.dto';

export class TipProjectDto {
  agreement_id: string;
  description: string;
}

export class TipSubmitterDto {
  name: string;
  email: string;
  idCard: string;
}

export class TipCountryDto {
  name: string;
  un_code: number;
}

export class TipRegionDto {
  name: string;
  un_code: number;
}

export class TipKnowledgeProductDto {
  created_at: string;
  updated_at: string;
  name: string;
  link: string;
  doi: string;
  citation: string;
  access_status: string;
  review_status: string;
  publication_date: string;
  project: TipProjectDto | TipProjectDto[];
  collection: string[];
  levers: string[];
  countries: TipCountryDto[];
  region: TipRegionDto[];
  submitter: TipSubmitterDto | null;
  type: string[];
  sdgs: string[];
  keywords: string[];
  programs_and_accelerators: string[];
  abstract: string;
}

export class TipKnowledgeProductsResponseDto {
  status: string;
  offset: number;
  limit: number;
  count: number;
  year: number;
  current_page: number;
  total_pages: number;
  data_count: number;
  data: TipKnowledgeProductDto[];
}

export class ResultsTipMapping {
  official_code: number;
  resultOfficialCode: number;
  external_link: string;
  public_link: string;
  created_at: Date;
  userData: SecUser;
  createResult: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  evidence: CreateResultEvidenceDto;
  knowledgeProduct: ResultKnowledgeProduct;
  geoScope: SaveGeoLocationDto;
  alignments: ResultAlignmentDto;
}

export class CounterResults {
  createdRecords: number;
  updatedRecords: number;
  errorRecords: number;

  constructor() {
    this.createdRecords = 0;
    this.updatedRecords = 0;
    this.errorRecords = 0;
  }
}

export enum CounterResultsEnum {
  CREATED = 'createdRecords',
  UPDATED = 'updatedRecords',
  ERROR = 'errorRecords',
}
