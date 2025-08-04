import { PartialType } from '@nestjs/swagger';
import { CreateAppSecretDto } from './create-app-secret.dto';

export class UpdateAppSecretDto extends PartialType(CreateAppSecretDto) {}
