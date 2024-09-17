import { PartialType } from '@nestjs/swagger';
import { CreateSessionPurposeDto } from './create-session-purpose.dto';

export class UpdateSessionPurposeDto extends PartialType(CreateSessionPurposeDto) {}
