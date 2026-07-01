import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('prms_temporal_results')
export class PrmsTemporalResultsEntity {
    @PrimaryColumn({
        type: 'bigint',
        name: 'code',
    })
    code: number;

    @PrimaryColumn({
        type: 'bigint',
        name: 'year',
    })
    year: number;

    @Column({
        type: 'json',
        name: 'data',
    })
    data: Record<string, any>;
}