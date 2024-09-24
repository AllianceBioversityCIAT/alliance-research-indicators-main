import { PartialType } from '@nestjs/swagger';
import { CreateSessionFormatDto } from './create-session-format.dto';

export class UpdateSessionFormatDto extends PartialType(
  CreateSessionFormatDto,
) {}
