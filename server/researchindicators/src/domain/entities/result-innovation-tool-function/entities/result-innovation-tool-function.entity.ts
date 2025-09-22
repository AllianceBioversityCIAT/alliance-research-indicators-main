import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AuditableEntity } from "../../../shared/global-dto/auditable.entity";
import { ApiProperty } from "@nestjs/swagger";
import { ResultInnovationDev } from "../../result-innovation-dev/entities/result-innovation-dev.entity";
import { ToolFunction } from "../../tool-functions/entities/tool-function.entity";

@Entity('result_innovation_tool_function')
export class ResultInnovationToolFunction extends AuditableEntity {
    @ApiProperty({
    type: Number,
    name: 'innovation_tool_function_id',
    })
    @PrimaryGeneratedColumn({
    name: 'innovation_tool_function_id',
    type: 'bigint',
    })
    innovation_tool_function_id!: number;

    @ApiProperty({
    type: Number,
    name: 'result_id',
    })
    @Column('bigint', {
    name: 'result_id',
    nullable: false,
    })
    result_id!: number;

    @ApiProperty({
    type: Number,
    name: 'tool_function_id',
    })
    @Column('bigint', {
    name: 'tool_function_id',
    nullable: false,
    })
    tool_function_id!: number;

    @ManyToOne(() => ResultInnovationDev, (resultInnovationDev) => resultInnovationDev.result_innovation_tool_functions)
    @JoinColumn({ name: 'result_id' })
    resultInnovationDev!: ResultInnovationDev;

    @ManyToOne(
    () => ToolFunction,
    (toolFunction) => toolFunction.result_innovation_tool_functions,
    )
    @JoinColumn({ name: 'tool_function_id' })
    toolFunction!: ToolFunction;
}
