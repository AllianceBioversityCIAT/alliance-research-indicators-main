import { PartialType } from '@nestjs/swagger';
import { CreateSessionLengthDto } from './create-session-length.dto';

export class UpdateSessionLengthDto extends PartialType(CreateSessionLengthDto) {}
