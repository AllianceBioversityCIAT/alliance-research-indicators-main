import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAdditionalGuidanceCaseElse1758556436328 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`clarisa_innovation_readiness_levels\`
            SET \`additional_guidance\` = CASE \`level\`
                WHEN 0 THEN 'No evidence is required.'
                WHEN 1 THEN 'Evidence may include literature reviews, research proposals, documentation describing conceptual frameworks.'
                WHEN 2 THEN 'Evidence may include technical design documents (e.g., blueprints, detailed protocols), draft manuals or guidelines specifying operational steps, pilot implementation plans describing intended testing methods.'
                WHEN 3 THEN 'Evidence may include reports on early-stage piloting in simulated or controlled settings, validation studies confirming that the innovation’s mechanisms are effective under preliminary conditions, proof-of-concept data from experiments or simulations.'
                WHEN 4 THEN 'Level 4 is a testing stage, where the innovation is actively evaluated in a fully-controlled conditions. Evidence may include controlled environment testing evidence, such as lab reports or experimental data.'
                WHEN 5 THEN 'Level 5 is a validation stage confirming readiness based on results from controlled testing. Evidence may include validation reports confirming performance in fully-controlled environments.'
                WHEN 6 THEN 'Level 6 is a testing stage, where the innovation is actively evaluated in semi-controlled conditions. Evidence may include data and documentation from testing under semi-controlled conditions, like pilot study results where not all variables are regulated.'
                WHEN 7 THEN 'Level 7 is a validation stage confirming readiness based on prior semi-controlled testing. Evidence may include documentation showing validation in semi-controlled settings (e.g., summaries of pilot results).'
                WHEN 8 THEN 'Level 8 is a testing stage involving evaluation in real-world settings. Evidence may include field trial data or initial user feedback to demonstrate performance in real-world settings.'
                WHEN 9 THEN 'Level 9 is a validation stage confirming readiness based on results in real-world environments with limited or no involvement of CGIAR. Evidence may include field data demonstrating the innovation has achieved desired impact real-world conditions.'
                ELSE NULL
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`clarisa_innovation_readiness_levels\`
            SET \`additional_guidance\` = NULL
        `);
    }

}
