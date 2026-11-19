import { MigrationInterface, QueryRunner } from 'typeorm';
import { readStaffCarnetColumnClause } from '../helpers/staff-carnet-column';

/**
 * Strategy framework tables
 * (docs/specs/institutional-performance/strategy-framework, design
 * section 3.1 and 3.3, R-STF-002, R-STF-003, R-STF-004, R-STF-005,
 * D-STF-2, D-STF-3, D-STF-15, D-STF-21).
 *
 * `framework_levels` holds one row per depth. The stored generated column
 * `indicator_portfolio_key` is the portfolio id only on the indicator level,
 * and the unique index on it allows one such level per portfolio (many NULLs
 * otherwise). `framework_elements` is one self-referencing table for every
 * depth; the parent foreign key is RESTRICT. Responsibles hang off an
 * element (CASCADE) and protect the staff row (RESTRICT). `staff_carnet`
 * takes the character set and collation of `alliance_user_staff.carnet`.
 *
 * This file exports ONLY its migration class. `down` drops only these
 * three tables, children first. The objective tables of the next migration
 * reference `framework_elements`, so that migration is reverted first.
 */
export class CreateFrameworkTables1795000000001 implements MigrationInterface {
  name = 'CreateFrameworkTables1795000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const carnetClause = await readStaffCarnetColumnClause(queryRunner);

    await queryRunner.query(`
      CREATE TABLE \`framework_levels\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`portfolio_id\` bigint NOT NULL,
        \`depth\` smallint NOT NULL,
        \`name\` varchar(60) NOT NULL,
        \`plural_name\` varchar(60) NOT NULL,
        \`short_label\` varchar(20) NOT NULL,
        \`is_indicator_level\` tinyint NOT NULL DEFAULT 0,
        \`indicator_portfolio_key\` bigint GENERATED ALWAYS AS (IF(\`is_indicator_level\` = 1, \`portfolio_id\`, NULL)) STORED,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_framework_levels_portfolio_depth\` (\`portfolio_id\`, \`depth\`),
        UNIQUE INDEX \`uq_framework_levels_indicator\` (\`indicator_portfolio_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`framework_levels\` ADD CONSTRAINT \`FK_framework_levels_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );

    await queryRunner.query(`
      CREATE TABLE \`framework_elements\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`portfolio_id\` bigint NOT NULL,
        \`level_id\` bigint NOT NULL,
        \`parent_id\` bigint NULL,
        \`code\` varchar(30) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_framework_elements_portfolio_code\` (\`portfolio_id\`, \`code\`),
        INDEX \`idx_framework_elements_parent\` (\`parent_id\`),
        INDEX \`idx_framework_elements_level\` (\`level_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`framework_elements\` ADD CONSTRAINT \`FK_framework_elements_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`framework_elements\` ADD CONSTRAINT \`FK_framework_elements_level_id\` FOREIGN KEY (\`level_id\`) REFERENCES \`framework_levels\`(\`id\`) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`framework_elements\` ADD CONSTRAINT \`FK_framework_elements_parent_id\` FOREIGN KEY (\`parent_id\`) REFERENCES \`framework_elements\`(\`id\`) ON DELETE RESTRICT`,
    );

    await queryRunner.query(`
      CREATE TABLE \`framework_element_responsibles\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`element_id\` bigint NOT NULL,
        \`staff_carnet\` varchar(10) ${carnetClause} NOT NULL,
        \`position\` smallint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_framework_element_resp\` (\`element_id\`, \`staff_carnet\`),
        INDEX \`idx_framework_element_resp_staff\` (\`staff_carnet\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`framework_element_responsibles\` ADD CONSTRAINT \`FK_framework_element_resp_element_id\` FOREIGN KEY (\`element_id\`) REFERENCES \`framework_elements\`(\`id\`) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`framework_element_responsibles\` ADD CONSTRAINT \`FK_framework_element_resp_staff_carnet\` FOREIGN KEY (\`staff_carnet\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`framework_element_responsibles\``);
    await queryRunner.query(`DROP TABLE \`framework_elements\``);
    await queryRunner.query(`DROP TABLE \`framework_levels\``);
  }
}
