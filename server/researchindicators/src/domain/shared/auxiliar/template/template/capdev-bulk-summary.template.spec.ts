import * as fs from 'fs';
import * as path from 'path';
import { CAPDEV_BULK_SUMMARY_TEMPLATE_HTML } from '../../../../../db/migrations/1786045516418-insertCapdevBulkSummaryTemplate';

/**
 * KZ-001 anti-drift gate.
 *
 * Production reads the `sec_template` row inserted by
 * `1786045516418-insertCapdevBulkSummaryTemplate.ts`. T-08's rendering
 * assertions read the on-disk `capdev-bulk-summary.html` mirror. If those
 * two strings ever diverge, every downstream rendering test measures
 * something users never actually receive.
 *
 * This spec reads the on-disk file and compares it byte-for-byte to the
 * literal the migration actually inserts, imported directly from the
 * migration module (not re-declared here) — so an edit to either side that
 * is not mirrored on the other fails this test.
 */
describe('capdev-bulk-summary.html — byte-equality with the seeded migration literal', () => {
  it('is byte-identical to the HTML the migration inserts into sec_template', () => {
    const diskHtml = fs.readFileSync(
      path.join(__dirname, 'capdev-bulk-summary.html'),
      'utf8',
    );

    expect(diskHtml).toBe(CAPDEV_BULK_SUMMARY_TEMPLATE_HTML);
  });
});
