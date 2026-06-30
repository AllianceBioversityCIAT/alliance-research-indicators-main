import { MigrationInterface, QueryRunner } from "typeorm";
import { LeverIcon } from "../../domain/tools/clarisa/entities/clarisa-levers/enum/LeversIcons.enum";

const levers = ['Lever 1', 'Lever 2', 'Lever 3', 'Lever 4', 'Lever 5', 'Lever 6', 'Lever 7', 'Lever 8', 'Other'];

export class InsertIconClarisaLever1782828905259 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const bucketUrl = process.env.ARI_BUCKET_URL;
        if (!bucketUrl) {
            throw new Error('ARI_BUCKET_URL is not set');
        }
        for (const shortName of levers) {
            const leverIcon = `${bucketUrl}/images/levers${LeverIcon[shortName]}`
            await queryRunner.query(`UPDATE clarisa_levers SET icon = '${leverIcon}' WHERE short_name = '${shortName}'`);

        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE clarisa_levers SET icon = NULL`);
    }

}
