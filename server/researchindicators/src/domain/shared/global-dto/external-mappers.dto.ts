import { CreateResultDto } from '../../entities/results/dto/create-result.dto';
import { ResultAlignmentDto } from '../../entities/results/dto/result-alignment.dto';
import { UpdateGeneralInformation } from '../../entities/results/dto/update-general-information.dto';

export class ExternalMappersDto {
  createResult: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  alignment: ResultAlignmentDto;
}

export abstract class ExternalMappersInterface<T> {
  abstract mapToExternalCreateResultDto(
    res: T[],
  ): Promise<ExternalMappersDto[]>;

  abstract createExternalResultAlignmentDto(
    res: ExternalMappersDto[],
  ): Promise<void>;
}
