import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewTablesLevers1760543753382 implements MigrationInterface {
  name = 'CreateNewTablesLevers1760543753382';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`lever_strategic_outcome\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`lever_id\` bigint NULL, \`strategic_outcome\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_lever_strategic_outcome\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_lever_id\` bigint NULL, \`lever_strategic_outcome_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_strategic_outcome\` ADD CONSTRAINT \`FK_881dce61dbdc4a0c4cc7adb55d6\` FOREIGN KEY (\`result_lever_id\`) REFERENCES \`result_levers\`(\`result_lever_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_strategic_outcome\` ADD CONSTRAINT \`FK_67929086ebe6a0b7f4f5aeff096\` FOREIGN KEY (\`lever_strategic_outcome_id\`) REFERENCES \`lever_strategic_outcome\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`INSERT INTO \`lever_strategic_outcome\` (lever_id, strategic_outcome) VALUES 
            (1, 'SO1: Priority countries adopt policies and build capacity to improve dietary diversity and diet quality of consumers.'),
            (1, 'SO2: Market actors increase equity and inclusion of women and youth in priority urban food environments.'),
            (1, 'SO3: National and international bodies promote more sustainably sourced, healthy food options.'),
            (2, 'SO1: National and subnational authorities in priority countries implement policies and incentives that promote evidence-based agro-environmental solutions that enhance ecosystem services and livelihoods in rural areas.'),
            (2, 'SO2: Land managers and development actors participate in the co-design and deployment of land uses that are more diverse and reduce the environmental impact of agricultural systems in priority countries.'),
            (2, 'SO3: Public and private value-chain actors participate in the negotiation and implementation of sustainable business models that lead to improved environmental outcomes in landscapes.'),
            (2, 'SO4: Producers sustainably manage productive farms and landscapes and have increased access to rural and urban markets in support of healthy diets.'),
            (3, 'SO1: Development partners use tailored climate services in priority countries to help farmers and their institutions reduce the impact of climate risks.'),
            (3, 'SO2: Development agencies make smarter investments that deliver climate adaptation and mitigation based on agricultural and climate risks profiled.'),
            (3, 'SO3: Newly established, innovative finance partnerships support climate adaptation and mitigation efforts across a range of geographies.'),
            (3, 'SO4: Farmers and their institutions co-develop adapted and low-emission agricultural practices and technologies, improving livelihoods, environmental sustainability, and food and nutrition security in priority countries.'),
            (4, 'SO1: National programs and communities in priority countries characterize and use diverse genebank and local material and crop wild relatives to address resilience, productivity, and nutrition challenges.'),
            (4, 'SO2: Inclusive formal, intermediate, and informal seed systems deliver forages, trees, and crops adapted to local conditions to improve food security and sustainability.'),
            (4, 'SO3: National governments adopt policies and practices recommended for genetic resources management.'),
            (4, 'SO4: Value-chain stakeholders integrate a greater diversity of crops for greater resilience and healthier diets.'),
            (5, 'SO1: National systems use digital extension systems that are inclusive (including empowering youth and women) and supportive of increasing livelihoods of farmers and improving food and nutrition security of consumers.'),
            (5, 'SO2: Agricultural research for development facilities is more responsive to farmers needs through two-way ICT-enabled information flows.'),
            (5, 'SO3: Partner institutions develop digital strategies and national policies to better harness digital approaches to deliver services to marginalized populations.'),
            (6, 'SO1: National institutions accelerate delivery of new varieties with higher nutritional value in target countries, by integrating genotyping, phenotyping, and participatory approaches.'),
            (6, 'SO2: Partner countries improve capacity in the use of nutrition-sensitive lenses and appropriate gender-responsive participatory and genetic methodologies in crop selection and breeding.'),
            (8, 'SO1: Extended Senior Management (partners and stakeholders) are considering performance information form the various dashboards for their strategic decision-making and forecasting.'),
            (8, 'SO2: Research Project Teams are capacitated to better implement MEL on their projects or project components and are using a range of tools to capture, document and build evidence of their outcomes delivery reporting.'),
            (8, 'SO3: Research Project Teams (partners and stakeholders) are using the support materials and capacity to facilitate development or use of TOC in their proposal development and are more strategic and successful in their resource mobilization.'),
            (7, 'SO1: Recognition of women, youth and marginalized groups as legitimate actors in food systems and their transformation.'),
            (7, 'SO2: Equitable representation, participation, voice and influence in change processes.'),
            (7, 'SO3: Equitable distribution of resources, costs and benefits among women and men in food systems.');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_lever_strategic_outcome\` DROP FOREIGN KEY \`FK_67929086ebe6a0b7f4f5aeff096\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_strategic_outcome\` DROP FOREIGN KEY \`FK_881dce61dbdc4a0c4cc7adb55d6\``,
    );
    await queryRunner.query(`DROP TABLE \`result_lever_strategic_outcome\``);
    await queryRunner.query(`DROP TABLE \`lever_strategic_outcome\``);
  }
}
