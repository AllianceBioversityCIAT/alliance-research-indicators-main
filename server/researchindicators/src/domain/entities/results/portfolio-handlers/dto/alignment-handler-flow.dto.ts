import { ApiProperty } from '@nestjs/swagger';
import { ResultAlignmentDto } from '../../dto/result-alignment.dto';
import { ResultSectionKeyEnum } from '../enum/result-section-key.enum';

export class AlignmentHandlerFlowDto {
  @ApiProperty({
    type: Number,
    description: 'Resolved portfolio id for the result',
  })
  portfolio_id: number;

  @ApiProperty({
    type: String,
    description: 'Handler class name that processed the request',
    example: 'Portfolio1AlignmentHandler',
  })
  handler: string;

  @ApiProperty({
    enum: ResultSectionKeyEnum,
    description: 'Result section key',
  })
  section: ResultSectionKeyEnum;

  @ApiProperty({
    type: ResultAlignmentDto,
    description: 'Alignment payload returned by the handler',
  })
  alignment: ResultAlignmentDto;
}
