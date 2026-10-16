import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema of `data.outcome` on B9 and B10 (design 4, "B9/B10 response outcome"). */
export class OrgSaveOutcomeDto {
  @ApiProperty({
    enum: [
      'create',
      'edit_in_place',
      'new_version',
      'code_change',
      'delegates_change',
    ],
    nullable: true,
    description:
      'The action the service logged; null when nothing was written. A version action wins over a code or delegates change in the same save',
  })
  action: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Year the versioned change applied from; null for code-only or delegates-only saves and no-ops',
  })
  appliesFromYear: number | null;

  @ApiProperty({
    type: Boolean,
    description: 'True when the save was a back-date',
  })
  backdated: boolean;
}
