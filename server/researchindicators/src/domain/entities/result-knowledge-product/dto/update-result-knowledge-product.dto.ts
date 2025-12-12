import { PartialType } from '@nestjs/swagger';
import { CreateResultKnowledgeProductDto } from './create-result-knowledge-product.dto';

export class UpdateResultKnowledgeProductDto extends PartialType(
  CreateResultKnowledgeProductDto,
) {}
