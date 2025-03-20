import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class AddedDescriptionColumnIndicators1729174028390
  implements MigrationInterface
{
  name = 'AddedDescriptionColumnIndicators1729174028390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`description\` text NULL`,
    );
    await queryRunner.query(
      `INSERT INTO indicators (indicator_id, name, description, indicator_type_id) VALUES (${IndicatorsEnum.INNOVATION_USE}, 'Innovation Use','A metric used to assess the extent to which an innovation is already being used, by which type of users and under which conditions, with a scale ranging from no use (lowest level) to common use (highest level).', 2)`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`description\` = 'Number of individuals trained or engaged by Alliance staff, aiming to lead to behavioral changes in knowledge, attitude, skills, and practice among CGIAR and non-CGIAR personnel.' WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`description\` = 'A new, improved, or adapted output or groups of outputs such as technologies, products and services, policies, and other organizational and institutional arrangements with high potential to contribute to positive impacts when used at scale.', \`name\` = 'Innovation Dev' WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`description\` = 'Defined by the CGIAR Open and FAIR Data Assets Policy using the term data asset. For reporting, users should only consider knowledge products that are integral to the Initiative/Project’s Theory of Change (ToC). To be eligible for reporting, a knowledge product should be a finalized product. Other data assets illustrating an output or outcome should not be reported under this indicator and should instead be used as evidence for the relevant output or outcome.', \`indicator_type_id\` = 1 WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`description\` = 'An evidence-based report detailing any outcome or impact that has resulted from the work of one or more CGIAR programs, initiatives, or centers. Outcome impact case reports must cite robust evidence to demonstrate the contribution of the CGIAR entity’s research findings or innovations to the outcome or impact. They are used to demonstrate results to funders.' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`description\` = 'Policies, strategies, legal instruments, programs, budgets, or investments at different scales (local to global) that have been modified in design or implementation, with evidence that the change was informed by Alliance research.' WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`description\``,
    );
  }
}
