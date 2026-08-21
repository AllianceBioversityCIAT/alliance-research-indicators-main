import { SecUser } from '../../complementary-entities/secondary/user/dto/sec-user.dto';
import { CreateResultEvidenceDto } from '../../entities/result-evidences/dto/create-result-evidence.dto';
import { CreateResultInstitutionDto } from '../../entities/result-institutions/dto/create-result-institution.dto';
import { ResultKnowledgeProduct } from '../../entities/result-knowledge-product/entities/result-knowledge-product.entity';
import { CreateResultPolicyChangeDto } from '../../entities/result-policy-change/dto/create-result-policy-change.dto';
import { UpdateResultCapacitySharingDto } from '../../entities/result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultInnovationDevDto } from '../../entities/result-innovation-dev/dto/create-result-innovation-dev.dto';
import { UpdateIpRightDto } from '../../entities/result-ip-rights/dto/update-ip-right.dto';
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
  partners: CreateResultInstitutionDto;
  policyChange: CreateResultPolicyChangeDto;
  capacitySharing: UpdateResultCapacitySharingDto;
  innovationDev: CreateResultInnovationDevDto;
  ipRights: UpdateIpRightDto;
}
