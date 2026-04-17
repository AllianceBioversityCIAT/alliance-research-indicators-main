import { MigrationInterface, QueryRunner } from 'typeorm';
import { SecRolesEnum } from '../../domain/shared/enum/sec_role.enum';

export class InsertNewRoles1776433682077 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO app_config 
                                 (created_at,created_by,updated_at,updated_by,is_active,deleted_at,\`key\`,description,simple_value,json_value,category,subcategory,field) VALUES
                                 ('2026-04-15 15:38:10.437267',NULL,'2026-04-15 15:38:10.437267',NULL,1,NULL,'BULK_UPLOAD.EMBED_INFO.URL','External URL to load the bulk upload appliation','https://datb5ly7vwnl2.cloudfront.net/',NULL,'BULK_UPLOAD','EMBED_INFO','URL')
                                 ;`);

    await queryRunner.query(`INSERT INTO sec_roles 
                                 (created_at,created_by,updated_at,updated_by,is_active,justification_update,sec_role_id,name,focus_id,deleted_at) VALUES
                                 ('2026-04-15 15:40:46.297915',NULL,'2026-04-15 15:40:46.297915',NULL,1,NULL,${SecRolesEnum.CENTER_ADMIN},'Center Admin',1,NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM app_config WHERE \`key\` = 'BULK_UPLOAD.EMBED_INFO.URL'`,
    );
    await queryRunner.query(
      `DELETE FROM sec_roles WHERE sec_role_id = ${SecRolesEnum.CENTER_ADMIN}`,
    );
  }
}
