import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateResultDto } from './create-result.dto';
import { ResultKeyword } from '../../result-keywords/entities/result-keyword.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';

export class UpdateGeneralInformation extends OmitType(CreateResultDto, [
  'indicator_id',
  'contract',
  'lever',
]) {
  @ApiProperty({
    type: ResultKeyword,
    isArray: true,
    name: 'keywords',
  })
  public keywords?: ResultKeyword[];

  @ApiProperty({
    type: ResultUser,
    name: 'main_contract_person',
  })
  public main_contract_person?: ResultUser;
}
