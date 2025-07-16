import { PartialType } from '@nestjs/swagger';
import { CreateToolFunctionDto } from './create-tool-function.dto';

export class UpdateToolFunctionDto extends PartialType(CreateToolFunctionDto) {}
