import { MigrationInterface, QueryRunner } from 'typeorm';
import { DeliveryModalityEnum } from '../../domain/entities/delivery-modalities/enum/delivery-modalities.enum';

export class InsertDeliveryModality1731437701566 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO delivery_modalities (delivery_modality_id, name) VALUES (${DeliveryModalityEnum.VIRTUAL}, 'Virtual'), (${DeliveryModalityEnum.HYBRID}, 'Hybrid'), (${DeliveryModalityEnum.IN_PERSON}, 'In-person')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM delivery_modalities WHERE delivery_modality_id IN (${DeliveryModalityEnum.VIRTUAL}, ${DeliveryModalityEnum.HYBRID}, ${DeliveryModalityEnum.IN_PERSON})`,
    );
  }
}
