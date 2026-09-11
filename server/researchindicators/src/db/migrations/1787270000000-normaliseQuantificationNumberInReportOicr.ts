import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SDD spec docs/specs/changes/measure-number-signed-decimal, T-06, DD-10,
 * design.md §9.1/§9.2, R-MSD-010.
 *
 * Recreates `report_oicr` (last defined at
 * `1780694172676-UpdateReportView.ts:5`) so the two `quantifications` /
 * `extrapolated_estimates` sub-selects render a `result_quantifications`
 * value through DD-10's expression instead of passing
 * `rq.quantification_number` straight into `report_field`. Reason: T-05
 * widened that column from `bigint` to `decimal(24,4)`, and MySQL's
 * `report_field(MEDIUMTEXT, ...)` casts the column to string on the way in
 * — a `bigint 10` rendered `'10'`; a `decimal(24,4) 10.0000` renders
 * `'10.0000'` unless something strips the trailing zeros first. `DD-10`'s
 * expression is that something, and only these two sites need it: they are
 * the only places in this view (or in any live migration — see
 * `design.md` §9's four-file enumeration) that pass
 * `rq.quantification_number` through `report_field`.
 *
 * **Only these two occurrences are touched.** The SQL text below is
 * `1780694172676`'s `up()` text for `report_oicr`
 * (`1780694172676-UpdateReportView.ts:5-85`), copied as-is except the two
 * `report_field(rq.quantification_number, …)` sites, which are replaced by
 * DD-10's expression — not reconstructed from `baseline.sql` prose, not
 * retyped from memory of that migration's source. Equivalence to the live
 * view body was verified by comparing MySQL's own **normalised**
 * definitions — `SHOW CREATE VIEW report_oicr`, captured on the scratch
 * schema before this migration's `up()` ran versus after its `down()`
 * ran — which come back identical except the `DEFINER` clause; that clause
 * is set from the connecting user at view-creation time, is not
 * expressible in migration text, and its difference across captures is the
 * expected control, not a defect (the three captures' `DEFINER` values are
 * `root@localhost`, `root@%`, `root@%`, tracking the connecting user in
 * each case). MySQL re-inserts its own normalisations on every
 * re-creation — a `convert(… using utf8mb3)` on `impact_area`,
 * `cast(… as char charset utf8mb4)` on the two touched sites — that this
 * file's source text does not and must not contain: the text below is
 * deliberately **not** a transcription of `SHOW CREATE VIEW` output, and
 * diffing it against one will surface differences that are MySQL's own
 * normalisation, not corruption. `down()` below re-issues that same
 * original `CREATE OR REPLACE VIEW` text (the pre-`up()` definition,
 * unedited) so a revert is a re-assertion of what MySQL already had, not a
 * hand-written approximation of it. The three `SHOW CREATE VIEW` captures
 * behind the equivalence claim above are recorded in `execution.md` →
 * `T-06`, not in this file — an append-only migration is the wrong place
 * for a comparison that depends on what a later run measures.
 *
 * **`report_link_result` is out of this migration's scope.**
 * `1780694172676` also (re)created that view in the same file, but it does
 * not reference `quantification_number` and `R-MSD-010` does not cover it.
 * Recreating it here would be a second append-only artifact with nothing
 * in this spec backing its content.
 *
 * DD-10's expression, applied at both sites, replacing the bare
 * `rq.quantification_number` argument to `report_field`:
 *
 *   IF(rq.quantification_number = TRUNCATE(rq.quantification_number, 0),
 *      CAST(TRUNCATE(rq.quantification_number, 0) AS CHAR),
 *      TRIM(TRAILING '0' FROM rq.quantification_number))
 *
 * Why the conditional, not a bare `CAST(TRUNCATE(x,0) AS CHAR)`
 * (design.md K-19): `report_oicr` filters `quantification_role_id IN (1,2)`
 * only, and DD-12 + DD-13 hold both of those roles to integers, so no
 * fractional row can reach this view's domain today — the `TRIM` branch is
 * unreachable in production right now. It is kept anyway, as a **declared
 * defensive case**, because `quantification_number` is a column shared with
 * role 3 (Innovation Use, which does carry decimals), and a future role
 * change or validation relaxation would otherwise start rendering
 * `10.0000` here with nothing in this file to stop it. This is a recorded
 * decision, not dead code — do not simplify it to the unconditional form.
 *
 * `down()`-safety, and the one place that reasoning is wrong (K-12): for a
 * `bigint` column (what `down()` of T-05's migration would produce),
 * `x = TRUNCATE(x, 0)` is true for every non-NULL integer, so the `TRIM`
 * branch stays unreachable there too — **except for `NULL`.**
 * `NULL = TRUNCATE(NULL, 0)` evaluates to `NULL`, which `IF()` treats as
 * false, so the *else* branch (`TRIM(TRAILING '0' FROM NULL)`, itself
 * `NULL`) runs instead of the branch that claim called the only live one.
 * The outcome is benign — `report_field(NULL, TRUE, TRUE)` already returns
 * `'Not provided'` today — but the branch selection differs from what the
 * `down()`-safety proof in `design.md` §9.2 originally claimed, and `NULL`
 * is a case that occurs (`oicr_validation`'s `IS NOT NULL` guard is the
 * evidence).
 *
 * `OQ-1` (accept `10.0000` in OICR exports, or ship this expression?) is
 * **open at the time this migration was written.** Recommendation on file
 * is "ship it"; the ruling is not this file's to make and is not recorded
 * as closed here — see `execution.md` → `T-06`.
 */
export class NormaliseQuantificationNumberInReportOicr1787270000000
  implements MigrationInterface
{
  name = 'NormaliseQuantificationNumberInReportOicr1787270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_oicr AS
            SELECT
                root.result_id,
                report_field(ro.general_comment, TRUE, root.indicator_id = 5) general_comment,
                report_field(ml.full_name , TRUE, root.indicator_id = 5) maturity_level,
                report_field(ro.oicr_internal_code, TRUE, root.indicator_id = 5) oicr_internal_code,
                report_field(ro.outcome_impact_statement, TRUE, root.indicator_id = 5) outcome_impact_statement,
                report_field(ro.short_outcome_impact_statement, TRUE, root.indicator_id = 5) short_outcome_impact_statement,
                report_field(ro.sharepoint_link, FALSE, root.indicator_id = 5) sharepoint_link,
                report_field(CONCAT_WS('', aus.first_name, ' ', aus.last_name), TRUE, root.indicator_id = 5) mel_regional_expert,
                report_field(rt.tag_name, TRUE , root.indicator_id = 5) tagging,
                report_field(rq.quantifications, FALSE, root.indicator_id = 5) quantifications,
                report_field(rq2.extrapolated_estimates , FALSE, root.indicator_id = 5) extrapolated_estimates,
                report_field(acp.authors_contact_persons, FALSE, root.indicator_id = 5) authors_contact_persons,
                report_field(IF(ro.for_external_use, 'YES', 'NO'), FALSE, root.indicator_id = 5) for_external_use,
                report_field(ro.for_external_use_description, FALSE, root.indicator_id = 5) for_external_use_description,
                report_field(ria.impact_area, TRUE, root.indicator_id = 5) impact_area,
                report_field(treo.existing_oicr, TRUE, root.indicator_id = 5 AND rt.tag_id IN (2,3) AND rt.tag_id IS NOT NULL ) existing_oicr,
                report_field(ro.cgspace_link, TRUE, root.indicator_id = 5) cgspace_link
            FROM results root
                LEFT JOIN result_oicrs ro ON ro.result_id = root.result_id
                LEFT JOIN maturity_levels ml ON ml.id = ro.maturity_level_id
                LEFT JOIN alliance_user_staff_groups ausg ON ausg.staff_group_id  = ro.mel_staff_group_id
                    AND ausg.carnet = ro.mel_regional_expert
                LEFT JOIN alliance_user_staff aus ON aus.carnet = ausg.carnet
                LEFT JOIN (SELECT
                                rt.result_id,
                                rt.tag_id,
                                t.name tag_name
                            FROM result_tags rt
                                INNER JOIN tags t ON t.id = rt.tag_id
                            WHERE rt.is_active = TRUE
                            GROUP BY rt.result_id
                            ORDER BY rt.result_id ASC) rt ON rt.result_id = root.result_id
                LEFT JOIN (SELECT
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(IF(rq.quantification_number = TRUNCATE(rq.quantification_number, 0), CAST(TRUNCATE(rq.quantification_number, 0) AS CHAR), TRIM(TRAILING '0' FROM rq.quantification_number)), TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') quantifications
                            FROM result_quantifications rq
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 1
                            GROUP BY rq.result_id) rq ON rq.result_id = root.result_id
                LEFT JOIN (SELECT
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(IF(rq.quantification_number = TRUNCATE(rq.quantification_number, 0), CAST(TRUNCATE(rq.quantification_number, 0) AS CHAR), TRIM(TRAILING '0' FROM rq.quantification_number)), TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') extrapolated_estimates
                            FROM result_quantifications rq
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 2
                            GROUP BY rq.result_id) rq2 ON rq2.result_id = root.result_id
                LEFT JOIN (SELECT
                                ru.result_id,
                                GROUP_CONCAT(CONCAT_WS('','• ',aus.first_name, ' ', aus.last_name, ' - Position: ', IFNULL(aus.\`position\`, 'N/D'), ' - Affiliation: ', IFNULL(aus.center, 'N/D')) SEPARATOR '\n') authors_contact_persons
                            FROM result_users ru
                                INNER JOIN alliance_user_staff aus ON aus.carnet = ru.user_id
                            WHERE ru.user_role_id = 3
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id) acp ON acp.result_id = root.result_id
                LEFT JOIN (SELECT
                                ria.result_id,
                                GROUP_CONCAT('• ', cia.name, ' - Score: ', report_field(CONCAT('(', ias.id - 1 ,') ', ias.name), TRUE, TRUE), '\n', rgt.global_targets   SEPARATOR '\n') impact_area
                            FROM result_impact_areas ria
                                LEFT JOIN clarisa_impact_areas cia ON cia.id = ria.impact_area_id
                                LEFT JOIN impact_area_scores ias ON ias.id = ria.impact_area_score_id
                                LEFT JOIN (SELECT
                                                riagt.result_impact_area_id,
                                                GROUP_CONCAT('\t◦ ', cgt.smo_code, ' - ', cgt.target SEPARATOR '\n') global_targets
                                            FROM result_impact_area_global_target riagt
                                                LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riagt.global_target_id
                                            WHERE riagt.is_active = TRUE
                                            GROUP BY riagt.result_impact_area_id) rgt ON rgt.result_impact_area_id = ria.id
                            WHERE ria.is_active = TRUE
                            GROUP BY ria.result_id) ria ON ria.result_id = root.result_id
                LEFT JOIN (SELECT
                                treo.result_id ,
                                CONCAT(teo.external_id, ' - ', teo.title, ' <',teo.handle_link,'>') existing_oicr
                            FROM TEMP_result_external_oicrs treo
                                INNER JOIN TEMP_external_oicrs teo on teo.id = treo.external_oicr_id
                            WHERE treo.is_active = TRUE
                            GROUP BY treo.result_id) treo ON treo.result_id = root.result_id
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC; `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_oicr AS
            SELECT
                root.result_id,
                report_field(ro.general_comment, TRUE, root.indicator_id = 5) general_comment,
                report_field(ml.full_name , TRUE, root.indicator_id = 5) maturity_level,
                report_field(ro.oicr_internal_code, TRUE, root.indicator_id = 5) oicr_internal_code,
                report_field(ro.outcome_impact_statement, TRUE, root.indicator_id = 5) outcome_impact_statement,
                report_field(ro.short_outcome_impact_statement, TRUE, root.indicator_id = 5) short_outcome_impact_statement,
                report_field(ro.sharepoint_link, FALSE, root.indicator_id = 5) sharepoint_link,
                report_field(CONCAT_WS('', aus.first_name, ' ', aus.last_name), TRUE, root.indicator_id = 5) mel_regional_expert,
                report_field(rt.tag_name, TRUE , root.indicator_id = 5) tagging,
                report_field(rq.quantifications, FALSE, root.indicator_id = 5) quantifications,
                report_field(rq2.extrapolated_estimates , FALSE, root.indicator_id = 5) extrapolated_estimates,
                report_field(acp.authors_contact_persons, FALSE, root.indicator_id = 5) authors_contact_persons,
                report_field(IF(ro.for_external_use, 'YES', 'NO'), FALSE, root.indicator_id = 5) for_external_use,
                report_field(ro.for_external_use_description, FALSE, root.indicator_id = 5) for_external_use_description,
                report_field(ria.impact_area, TRUE, root.indicator_id = 5) impact_area,
                report_field(treo.existing_oicr, TRUE, root.indicator_id = 5 AND rt.tag_id IN (2,3) AND rt.tag_id IS NOT NULL ) existing_oicr,
                report_field(ro.cgspace_link, TRUE, root.indicator_id = 5) cgspace_link
            FROM results root
                LEFT JOIN result_oicrs ro ON ro.result_id = root.result_id
                LEFT JOIN maturity_levels ml ON ml.id = ro.maturity_level_id
                LEFT JOIN alliance_user_staff_groups ausg ON ausg.staff_group_id  = ro.mel_staff_group_id
                    AND ausg.carnet = ro.mel_regional_expert
                LEFT JOIN alliance_user_staff aus ON aus.carnet = ausg.carnet
                LEFT JOIN (SELECT
                                rt.result_id,
                                rt.tag_id,
                                t.name tag_name
                            FROM result_tags rt
                                INNER JOIN tags t ON t.id = rt.tag_id
                            WHERE rt.is_active = TRUE
                            GROUP BY rt.result_id
                            ORDER BY rt.result_id ASC) rt ON rt.result_id = root.result_id
                LEFT JOIN (SELECT
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') quantifications
                            FROM result_quantifications rq
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 1
                            GROUP BY rq.result_id) rq ON rq.result_id = root.result_id
                LEFT JOIN (SELECT
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') extrapolated_estimates
                            FROM result_quantifications rq
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 2
                            GROUP BY rq.result_id) rq2 ON rq2.result_id = root.result_id
                LEFT JOIN (SELECT
                                ru.result_id,
                                GROUP_CONCAT(CONCAT_WS('','• ',aus.first_name, ' ', aus.last_name, ' - Position: ', IFNULL(aus.\`position\`, 'N/D'), ' - Affiliation: ', IFNULL(aus.center, 'N/D')) SEPARATOR '\n') authors_contact_persons
                            FROM result_users ru
                                INNER JOIN alliance_user_staff aus ON aus.carnet = ru.user_id
                            WHERE ru.user_role_id = 3
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id) acp ON acp.result_id = root.result_id
                LEFT JOIN (SELECT
                                ria.result_id,
                                GROUP_CONCAT('• ', cia.name, ' - Score: ', report_field(CONCAT('(', ias.id - 1 ,') ', ias.name), TRUE, TRUE), '\n', rgt.global_targets   SEPARATOR '\n') impact_area
                            FROM result_impact_areas ria
                                LEFT JOIN clarisa_impact_areas cia ON cia.id = ria.impact_area_id
                                LEFT JOIN impact_area_scores ias ON ias.id = ria.impact_area_score_id
                                LEFT JOIN (SELECT
                                                riagt.result_impact_area_id,
                                                GROUP_CONCAT('\t◦ ', cgt.smo_code, ' - ', cgt.target SEPARATOR '\n') global_targets
                                            FROM result_impact_area_global_target riagt
                                                LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riagt.global_target_id
                                            WHERE riagt.is_active = TRUE
                                            GROUP BY riagt.result_impact_area_id) rgt ON rgt.result_impact_area_id = ria.id
                            WHERE ria.is_active = TRUE
                            GROUP BY ria.result_id) ria ON ria.result_id = root.result_id
                LEFT JOIN (SELECT
                                treo.result_id ,
                                CONCAT(teo.external_id, ' - ', teo.title, ' <',teo.handle_link,'>') existing_oicr
                            FROM TEMP_result_external_oicrs treo
                                INNER JOIN TEMP_external_oicrs teo on teo.id = treo.external_oicr_id
                            WHERE treo.is_active = TRUE
                            GROUP BY treo.result_id) treo ON treo.result_id = root.result_id
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC; `);
  }
}
