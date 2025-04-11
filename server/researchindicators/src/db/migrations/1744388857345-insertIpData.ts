import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class InsertIpData1744388857345 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            insert into result_cap_sharing_ip (result_cap_sharing_ip_id)        
            select r.result_id
            from results r 
            	left join result_cap_sharing_ip rcsi on r.result_id = rcsi.result_cap_sharing_ip_id 
            where r.indicator_id = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}
            	and rcsi.result_cap_sharing_ip_id is null;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
