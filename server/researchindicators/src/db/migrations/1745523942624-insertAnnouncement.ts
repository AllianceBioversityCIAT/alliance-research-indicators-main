import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertAnnouncement1745523942624 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`results\`
            ADD COLUMN \`tip_id\` bigint NULL
        `);

    await queryRunner.query(`
        insert into announcement_settings (title, description, src, link, start_date, end_date)
        values ('Your New Reporting Tool', 'Welcome to STAR! Explore, create, and manage your projects and results with ease.', null, null, null, null);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`results\`
        DROP COLUMN \`tip_id\`
    `);

    await queryRunner.query(`
        delete from announcement_settings
        where title = 'Your New Reporting Tool'
        and description = 'Welcome to STAR! Explore, create, and manage your projects and results with ease.'`);
  }
}
