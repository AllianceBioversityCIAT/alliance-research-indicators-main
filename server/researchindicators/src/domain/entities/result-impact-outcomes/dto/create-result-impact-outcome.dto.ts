import { ApiProperty } from "@nestjs/swagger";

export class CreateResultImpactOutcomeDto {
    @ApiProperty({
        type: Number,
        description: 'The id of the impact outcome',
        example: 1,
    })
    impact_outcome_id: number;
}
