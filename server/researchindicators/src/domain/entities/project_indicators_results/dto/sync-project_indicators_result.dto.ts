import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class SyncProjectIndicatorsResultDto {
    @IsOptional()
    @IsNumber()
    id: number;

    @IsNotEmpty()
    @IsNumber()
    result_id: number;

    @IsNotEmpty()
    @IsNumber()
    indicator_id: number;

    @IsNotEmpty()
    @IsNumber()
    contribution_value: number;
}