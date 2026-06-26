import { Column, Entity, OneToMany } from "typeorm";
import { AuditableEntity } from "../../../shared/global-dto/auditable.entity";
import { ResultStrategicObjective } from "./result-strategic-objective.entity";
import { PrimaryGeneratedColumn } from "typeorm";

@Entity('result_strategic_objective_roles')
export class ResultStrategicObjectiveRoles extends AuditableEntity {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        name: 'id',
    })
    id: number;

    @Column({
        type: 'text',
        name: 'name',
    })
    name: string;

    @OneToMany(() => ResultStrategicObjective, (resultStrategicObjective) => resultStrategicObjective.role)
    resultStrategicObjectives: ResultStrategicObjective[];

}