import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertAndUpdateNewStatus1767821369314
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Draft (ID: 4)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = ?, 
        config = ? 
        WHERE result_status_id = 4
        `,
      [
        'Draft',
        'The result is still being created and it can be edited at any time.\nIt is not yet part of any formal review or validation process.',
        '[1,3,9]',
        '{"color":{"border":"#79D9FF","text":"#1689CA","background":null},"icon":{"color":"#1689CA","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Submitted (ID: 2)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 2
        `,
      [
        'Submitted',
        'The result has been formally submitted. It should no longer be edited by the user.\nIt is waiting for review and validation.',
        '{"color":{"border":"#7C9CB9","text":"#173F6F","background":null},"icon":{"color":"#173F6F","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Approved (ID: 6)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 6
        `,
      [
        'Approved',
        'The result has passed all required validations.\nIt is ready to be displayed in the Results Dashboard, and the reporting process for this result is considered completed.',
        '{"color":{"border":"#A8CEAB","text":"#7CB580","background":null},"icon":{"color":"#7CB580","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Pending Revision (ID: 5)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 5
        `,
      [
        'Pending Revision',
        'The result has been reviewed and requires corrections. Feedback should have been provided.\nThe user must update the information and re-submit it.',
        '{"color":{"border":"#E69F00","text":"#F58220","background":null},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Not approved (ID: 7)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 7
        `,
      [
        'Not approved',
        'The result was reviewed and it seems it does not meet the required quality or validation criteria.\nA reason should have been provided.',
        '{"color":{"border":"#EA8A8A","text":"#CF0808","background":null},"icon":{"color":"#CF0808","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Deleted (ID: 8)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 8
        `,
      [
        'Deleted',
        'The result has been removed from the system. It is no longer active or visible in workflows.\nIt is kept only for historical or audit purposes, if applicable.',
        '{"color":{"border":"#A2A9AF","text":"#A2A9AF","background":null},"icon":{"color":"#A2A9AF","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // ========== OICR SECTION ==========

    // OICR Requested (ID: 9)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = ?, 
        config = ? 
        WHERE result_status_id = 9
        `,
      [
        'OICR Requested',
        'The user has formally requested the creation of the OICR.\nThe SPRM team will review it and decide whether it moves forward for backstopping by the PISA–SPRM team, is postponed to the next year, or is not approved.',
        '[1,9]',
        '{"color":{"border":"#CAA040","text":"#BD7233","background":null},"icon":{"color":"#BD7233","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR Not Accepted (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )`,
      [
        15,
        'OICR Not Accepted',
        'The OICR submission is reviewed and not accepted.\nA justification is provided explaining the decision.',
        '{"color":{"border":"#EA8A8A","text":"#CF0808","background":null},"icon":{"color":"#CF0808","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR Postponed (ID: 11)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ?
        WHERE result_status_id = 11
        `,
      [
        'OICR Postponed',
        'The OICR request has been reviewed and its processing has been deferred.\nThe SPRM team has decided to postpone it to a future reporting cycle.',
        '{"color":{"border":"#E69F00","text":"#F58220","background":null},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR Accepted (ID: 10)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = ?, 
        config = ?
        WHERE result_status_id = 10
        `,
      [
        'OICR Accepted',
        'The OICR request is formally accepted.\nThe OICR is in the development phase with ongoing backstopping from the PISA–SPRM team.',
        '[1,9]',
        '{"color":{"border":"#A8CEAB","text":"#7CB580","background":null},"icon":{"color":"#7CB580","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR in Science edition (ID: 12)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = ?, 
        config = ? 
        WHERE result_status_id = 12
        `,
      [
        'OICR in Science edition',
        'The OICR is under scientific editing.\nContent accuracy, clarity, and scientific quality are being reviewed.',
        '[1,9]',
        '{"color":{"border":"#B0C4DD","text":"#7C9CB9","background":null},"icon":{"color":"#7C9CB9","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR in KM Curation (ID: 13)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = ?, 
        config = ? 
        WHERE result_status_id = 13
        `,
      [
        'OICR in KM Curation',
        'The OICR is being curated for knowledge management purposes.\nMetadata, classification, and discoverability are being finalized.',
        '[1,9]',
        '{"color":{"border":"#A2A9AF","text":"#777C83","background":null},"icon":{"color":"#777C83","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // OICR Published (ID: 14)
    await queryRunner.query(
      `
        UPDATE result_status SET 
        name = ?, 
        description = ?, 
        editable_roles = null, 
        config = ? 
        WHERE result_status_id = 14
        `,
      [
        'OICR Published',
        'The OICR has been officially published.\nIt is publicly available in CGSpace.',
        '{"color":{"border":"#7CB580","text":"#358540","background":null},"icon":{"color":"#358540","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // ========== PRMS SECTION ==========

    // Editing in PRMS (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )`,
      [
        16,
        'Editing in PRMS',
        'The result in PRMS is still being created and it can be edited at any time.\nIt is not yet part of any formal review or validation process.',
        '{"color":{"border":"#79D9FF","text":"#1689CA","background":null},"icon":{"color":"#1689CA","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Submitted in PRMS (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )`,
      [
        17,
        'Submitted in PRMS',
        'The result has been formally submitted in PRMS.\nIt is awaiting review by the System Office and Quality Assurance. If it does not pass the QA process, it remains in this status.',
        '{"color":{"border":"#7C9CB9","text":"#173F6F","background":null},"icon":{"color":"#173F6F","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // QAed in PRMS (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )`,
      [
        18,
        'QAed in PRMS',
        'The result has successfully passed the QA process defined by the System Office.\nThis means that the result meets the required quality standards and is therefore very likely available in the CGIAR Results Dashboard.',
        '{"color":{"border":"#1689CA","text":"#035BA9","background":null},"icon":{"color":"#035BA9","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Discontinued in PRMS (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )`,
      [
        19,
        'Discontinued in PRMS',
        'The innovation is no longer active and the associated investment has been discontinued.\nNo further development, implementation, or reporting activities are expected for this result.',
        '{"color":{"border":"#A2A9AF","text":"#8D9299","background":null},"icon":{"color":"#8D9299","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // ========== TIP SECTION ==========

    // Completed in TIP (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )
        `,
      [
        20,
        'Completed in TIP',
        'The Knowledge Product has been successfully finalized and disseminated.\nIt is already available in a recognized knowledge repository and is considered fully published and accessible.',
        '{"color":{"border":"#7CB580","text":"#358540","background":null},"icon":{"color":"#358540","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // ========== AICCRA SECTION ==========

    // Editing in AICCRA (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )
        `,
      [
        21,
        'Editing in AICCRA',
        'The result in MARLO-AICCRA is still being created and it can be edited at any time.\nIt is not yet part of any formal review or validation process.',
        '{"color":{"border":"#79D9FF","text":"#1689CA","background":null},"icon":{"color":"#1689CA","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );

    // Submitted in AICCRA (NUEVO)
    await queryRunner.query(
      `
        INSERT INTO result_status (result_status_id, name, description, editable_roles, config) 
        values (
        ?,
        ?, 
        ?, 
        null, 
        ?
        )
        `,
      [
        22,
        'Submitted in AICCRA',
        'The result has been formally submitted in MARLO-AICCRA.',
        '{"color":{"border":"#7C9CB9","text":"#173F6F","background":null},"icon":{"color":"#173F6F","name":"pi pi-exclamation-circle"},"image":null}',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Submitted',
            description = null,
            config = null
        WHERE result_status_id = 2
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Draft',
            description = null,
            config = null
        WHERE result_status_id = 4
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Pending Revision',
            description = null,
            config = null
        WHERE result_status_id = 5
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Approved',
            description = null,
            config = null
        WHERE result_status_id = 6
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Do not approve',
            description = null,
            config = null
        WHERE result_status_id = 7
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Deleted',
            description = null,
            config = null
        WHERE result_status_id = 8
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Requested',
            description = null,
            config = null
        WHERE result_status_id = 9
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Approved',
            description = null,
            config = null
        WHERE result_status_id = 10
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Postponed',
            description = null,
            config = null
        WHERE result_status_id = 11
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Science Edition',
            description = null,
            config = null
        WHERE result_status_id = 12
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'KM Curation',
            description = null,
            config = null
        WHERE result_status_id = 13
    `);

    await queryRunner.query(`
        UPDATE result_status 
        SET name = 'Published',
            description = null,
            config = null
        WHERE result_status_id = 14
    `);
  }
}
