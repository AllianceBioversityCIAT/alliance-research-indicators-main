import { PartialType } from '@nestjs/swagger';
import { CreateSessionTypeDto } from './create-session-type.dto';

export class UpdateSessionTypeDto extends PartialType(CreateSessionTypeDto) {}
