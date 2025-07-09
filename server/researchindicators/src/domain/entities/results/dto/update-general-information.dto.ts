import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateResultDto } from './create-result.dto';
import { ResultUser } from '../../result-users/entities/result-user.entity';
import { ResultSdg } from '../../result-sdgs/entities/result-sdg.entity';

export class UpdateGeneralInformation extends OmitType(CreateResultDto, [
  'indicator_id',
  'contract_id',
]) {
  @ApiProperty({
    type: String,
    isArray: true,
    name: 'keywords',
  })
  public keywords?: string[];

  @ApiProperty({
    type: ResultUser,
    name: 'main_contact_person',
  })
  public main_contact_person?: ResultUser;

  @ApiProperty({
    type: ResultSdg,
    isArray: true,
    name: 'result_sdgs',
  })
  public result_sdgs?: ResultSdg[];
}
