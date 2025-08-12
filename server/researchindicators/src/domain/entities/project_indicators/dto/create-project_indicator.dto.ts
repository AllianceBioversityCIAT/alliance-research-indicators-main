import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProjectIndicatorDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsNumber()
    @IsOptional()
    level: number;

    @IsString()
    @IsNotEmpty()
    numberType: string;

    @IsString()
    @IsOptional()
    numberFormat: string;

    @IsArray()
    @Type(() => Number)
    @IsInt({ each: true })
    years: number[];

    @IsString()
    @IsOptional()
    targetUnit: string;

    @IsNumber()
    @IsOptional()
    targetValue: number;

    @IsNumber()
    @IsOptional()
    baseline: number;
}
