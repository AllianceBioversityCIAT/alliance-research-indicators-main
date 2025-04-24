import { ApiProperty } from '@nestjs/swagger';
import { AuthorizationDto } from './auth.dto';

export class EmailBodyMessage {
  @ApiProperty()
  text?: string;
  @ApiProperty()
  socketFile?: Buffer;
}

export class EmailBody {
  @ApiProperty()
  subject: string;
  @ApiProperty()
  to: string;
  @ApiProperty()
  cc?: string;
  @ApiProperty()
  bcc?: string;
  @ApiProperty()
  message: EmailBodyMessage;
}

export class FromBody {
  @ApiProperty()
  email: string;
  @ApiProperty()
  name?: string;
}

export class ConfigMessageDto {
  @ApiProperty()
  from?: FromBody;
  @ApiProperty()
  emailBody: EmailBody;
}

export class ConfigMessageSocketDto {
  public auth: AuthorizationDto;
  public data: ConfigMessageDto;
}
