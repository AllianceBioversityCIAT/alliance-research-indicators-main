import { MigrationInterface, QueryRunner } from 'typeorm';
import { IntellectualPropertyOwnerEnum } from '../../domain/entities/intellectual-property-owners/enum/intellectual-property-owner.enum';

export class InsertIpOwners1744381483563 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO intellectual_property_owner (intellectual_property_owner_id, name)
            VALUES (${IntellectualPropertyOwnerEnum.INTELLECTUAL_CTA}, 'International Center for Tropical Agriculture - CIAT'),
                   (${IntellectualPropertyOwnerEnum.BIOVERSITY_INTERNATIONAL}, 'Bioversity International'),
                   (${IntellectualPropertyOwnerEnum.BIOVERSITY_INTERNATIONAL_INTELLECTUAL_CTA}, 'Bioversity International and International Center for Tropical Agriculture - CIAT'),
                   (${IntellectualPropertyOwnerEnum.OTHERS}, 'Others');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM intellectual_property_owner
            WHERE intellectual_property_owner_id IN (
                ${IntellectualPropertyOwnerEnum.INTELLECTUAL_CTA},
                ${IntellectualPropertyOwnerEnum.BIOVERSITY_INTERNATIONAL},
                ${IntellectualPropertyOwnerEnum.BIOVERSITY_INTERNATIONAL_INTELLECTUAL_CTA},
                ${IntellectualPropertyOwnerEnum.OTHERS}
            );
        `);
  }
}
