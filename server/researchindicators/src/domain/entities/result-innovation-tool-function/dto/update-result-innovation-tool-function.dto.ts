import { PartialType } from '@nestjs/mapped-types';
import { CreateResultInnovationToolFunctionDto } from './create-result-innovation-tool-function.dto';

export class UpdateResultInnovationToolFunctionDto extends PartialType(
  CreateResultInnovationToolFunctionDto,
) {}
