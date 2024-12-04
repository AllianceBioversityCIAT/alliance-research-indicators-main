import { OmitType } from '@nestjs/swagger';
import { PartnerRequestCreate } from './partner-request-create.dto';

export class PartnerRequestCliDataDto extends OmitType(PartnerRequestCreate, [
  'externalUserMail',
  'externalUserName',
  'userId',
  'misAcronym',
]) {}
