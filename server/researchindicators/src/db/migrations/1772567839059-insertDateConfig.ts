import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertDateConfig1772567839059 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO app_config (\`key\`, \`description\`, \`json_value\`) values (?,?,?)`,
            ['date-format', 'Configurable display/parse rules for date-time formatting and timezone.', JSON.stringify({
                "locale": "en-US",
                "timezone": {
                    "iana": "Europe/Paris",
                    "displayName": "CET",
                    "abbreviationMode": "AUTO"
                },
                "date": {
                    "style": "numeric",
                    "order": "DMY",
                    "separator": "/",
                    "twoDigitDay": true,
                    "twoDigitMonth": true,
                    "fourDigitYear": true,

                    "monthName": {
                        "enabled": false,
                        "format": "long",
                        "uppercase": true
                    }
                },
                "time": {
                    "hour12": true,
                    "twoDigitMinute": true
                },
                "display": {
                    "order": "DATE_TIME",
                    "separator": " at ",
                    "suffix": {
                        "enabled": true,
                        "style": "AUTO_TZ_ABBR",
                        "fallback": "CET",
                        "wrap": "PAREN"
                    }
                }
            })],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM app_config WHERE key = ?`,
            ['date-format'],
        );
    }
}
