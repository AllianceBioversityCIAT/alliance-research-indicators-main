import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateColorsStatus1767904959663 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ? WHERE result_status_id = ?`,
      [
        'OICR in KM Curation',
        `The OICR is being curated for knowledge management purposes.
Metadata, classification, and discoverability are being finalized.`,
        '[1, 9]',
        '{"color":{"border":"#A2A9AF","text":"#6B7280","background":null},"icon":{"color":"#6B7280","name":"pi pi-exclamation-circle"},"image":null}',
        13,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ? WHERE result_status_id = ?`,
      [
        'OICR in KM Curation',
        `The OICR is being curated for knowledge management purposes.
Metadata, classification, and discoverability are being finalized.`,
        '[1, 9]',
        '{"icon": {"name": "pi pi-exclamation-circle", "color": "#777C83"}, "color": {"text": "#777C83", "border": "#A2A9AF", "background": null}, "image": null}',
        13,
      ],
    );
  }
}
