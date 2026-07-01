import { SecUser } from '../../complementary-entities/secondary/user/dto/sec-user.dto';
import { CreateResultEvidenceDto } from '../../entities/result-evidences/dto/create-result-evidence.dto';
import { ResultKnowledgeProduct } from '../../entities/result-knowledge-product/entities/result-knowledge-product.entity';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { CreateResultDto } from '../../entities/results/dto/create-result.dto';
import { ResultAlignmentDto } from '../../entities/results/dto/result-alignment.dto';
import { SaveGeoLocationDto } from '../../entities/results/dto/save-geo-location.dto';
import { UpdateGeneralInformation } from '../../entities/results/dto/update-general-information.dto';

export abstract class ExternalMappersInterface<T> {
  abstract mapToExternalCreateResultDto(res: T[]): Promise<void>;
}

export class ExternalMappersDto {
  is_version_applied?: boolean;
  official_code: number;
  resultOfficialCode: number;
  external_link: string;
  public_link: string;
  status_id: ResultStatusEnum;
  created_at: Date;
  userData: SecUser;
  createResult: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  evidence: CreateResultEvidenceDto;
  knowledgeProduct: ResultKnowledgeProduct;
  geoScope: SaveGeoLocationDto;
  alignments: ResultAlignmentDto;
}
