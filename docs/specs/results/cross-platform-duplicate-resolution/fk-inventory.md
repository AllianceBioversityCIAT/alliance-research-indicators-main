# T-01 — FK inventory & delete-function baseline

- **Spec:** results / cross-platform-duplicate-resolution
- **Task:** T-01 (gates T-02, T-05, and every destructive task)
- **Source:** `information_schema` + `SHOW CREATE FUNCTION` on the live dev database
- **Method:** machine-generated, read-only (`SELECT`/`SHOW` only). **Not** derived from TypeORM entities, migration greps, or the design document's figures — that is this task's disqualifying-evidence clause.
- **Generated:** see the commit date of this file

---

## 0. Why this artifact exists

The first revision of this spec derived the same facts from a TypeORM entity walk and an unsorted `grep | tail` over migrations. It got the delete-function baseline, the `link_results` direction handling, and the uncovered-table list all wrong, and a two-round adversarial review escalated on it. Two tables are structurally invisible to entity-derived methods:

- `result_cap_sharing_ip` — holds a live FK to `results`, has **no TypeORM entity**.
- `project_indicators_results` — appears in **no migration at all**; its FK exists only in the live schema.

Anything that consumes this file must consume *these* numbers, not the design's.

---

## 1. Summary

| Measure | Value |
| --- | --- |
| FKs referencing `results(result_id)` | **38** across 37 tables |
| `ON DELETE NO ACTION` | **37** |
| `ON DELETE CASCADE` | **1** |
| `full_delete_result_version` DELETE targets | **44** |
| Body length (bytes) | 8881 |
| **Uncovered, `NO ACTION`** (raise errno 1451 → T-02 must add) | **0** |
| **Uncovered, `CASCADE`** (silently destroyed → T-05 must protect) | **1** |
| Cross-result FK shapes | **5** |
| Base tables with a `result_id` column and **no FK** (classify, §2.1) | 1 |
| Views exposing `result_id` (**never** deletion targets) | 17 |

`link_results` handling in the live function:

```sql
DELETE FROM link_results WHERE result_id = temp_result_id OR other_result_id = temp_result_id;
```

Both directions — so a hard delete of a row referenced as `other_result_id` does **not** raise errno 1451. There is no loud database backstop; `StarRelationshipService` (T-05) is the only protection, and a bug in it fails **silently**.

---

## 2. T-02 input — tables the function must additionally delete from

`ON DELETE NO ACTION`, uncovered. Each one raises **errno 1451** on a hard delete while any child row exists:



**That is the complete blocking set.** No other table can raise errno 1451, because errno 1451 requires an enforced FK.

### 2.1 Base tables carrying `result_id` with no FK — classify, do not bulk-add

These cannot raise errno 1451 and are **not** T-02 blockers. They are orphan-row hygiene, and each needs a decision: an orphaned row in a reporting snapshot may be *correct* (the snapshot records what was true then), while an orphaned row in a temp/staging table is garbage. **Do not add these to the delete function without deciding per table** — row counts are included so the decision rests on data rather than on a name.

| Table | Rows | Note |
| --- | --- | --- |
| `TEMP_result_external_oicrs` | 326 | temp/staging — orphan is garbage, safe to clear |

This is exactly the one table `design.md` §3.2 named for hygiene — the schema enumeration confirms it rather than widening it. The 17 other objects exposing `result_id` are all views (§2.2).

### 2.2 Views — excluded by construction

`report_alliance_alignment`, `report_capacity_sharing_development`, `report_evidences`, `report_general_information`, `report_geo_location`, `report_innovation_dev`, `report_ip_rights`, `report_link_result`, `report_oicr`, `report_partners`, `report_policy_change`, `vw_results_dashboard_cap_sharing`, `vw_results_dashboard_countries`, `vw_results_dashboard_policies`, `vw_results_dashboard_regions`, `vw_results_dashboard_results`, `vw_results_dashboard_sdgs`

Views expose `result_id` but are **never** deletion targets. Noted because the first generation of this artifact listed them alongside real tables, which would have put `DELETE FROM vw_…` into the migration. A schema enumeration must filter on `TABLE_TYPE = 'BASE TABLE'`.

## 3. T-05 input — references that must **protect**, not be deleted

`ON DELETE CASCADE`, uncovered — the delete succeeds and **silently destroys rows the soft delete preserves**:

- `project_indicators_results` — column `result_id`. Belongs to a *project indicator*, not to the result. Treated as a protecting relationship per D-dup-16.

Cross-result FK shapes — a row owned by one result referencing **another** result's sub-row, the same shape as `link_results.other_result_id`:

| Table | Column | References | DELETE_RULE |
| --- | --- | --- | --- |
| `result_innovation_tool_function` | `result_id` | `result_innovation_dev(result_id)` | `NO ACTION` |
| `result_pool_funding_indicator_mapping` | `result_capacity_sharing_id` | `result_capacity_sharing(result_id)` | `NO ACTION` |
| `result_pool_funding_indicator_mapping` | `result_innovation_dev_id` | `result_innovation_dev(result_id)` | `NO ACTION` |
| `result_pool_funding_indicator_mapping` | `result_knowledge_product_id` | `result_knowledge_products(result_id)` | `NO ACTION` |
| `result_pool_funding_indicator_mapping` | `result_policy_change_id` | `result_policy_change(result_id)` | `NO ACTION` |

---

## 4. Full FK inventory

| Table | Column | DELETE_RULE | Covered by the function |
| --- | --- | --- | --- |
| `bulk_upload_results` | `result_id` | `NO ACTION` | ✅ |
| `link_results` | `other_result_id` | `NO ACTION` | ✅ |
| `link_results` | `result_id` | `NO ACTION` | ✅ |
| `project_indicators_results` | `result_id` | `CASCADE` | ❌ |
| `result_actors` | `result_id` | `NO ACTION` | ✅ |
| `result_cap_sharing_ip` | `result_cap_sharing_ip_id` | `NO ACTION` | ✅ |
| `result_capacity_sharing` | `result_id` | `NO ACTION` | ✅ |
| `result_contracts` | `result_id` | `NO ACTION` | ✅ |
| `result_countries` | `result_id` | `NO ACTION` | ✅ |
| `result_evidences` | `result_id` | `NO ACTION` | ✅ |
| `result_impact_areas` | `result_id` | `NO ACTION` | ✅ |
| `result_impact_outcomes` | `result_id` | `NO ACTION` | ✅ |
| `result_initiatives` | `result_id` | `NO ACTION` | ✅ |
| `result_innovation_dev` | `result_id` | `NO ACTION` | ✅ |
| `result_institution_ai` | `result_id` | `NO ACTION` | ✅ |
| `result_institution_types` | `result_id` | `NO ACTION` | ✅ |
| `result_institutions` | `result_id` | `NO ACTION` | ✅ |
| `result_ip_rights` | `result_ip_rights_id` | `NO ACTION` | ✅ |
| `result_keywords` | `result_id` | `NO ACTION` | ✅ |
| `result_knowledge_products` | `result_id` | `NO ACTION` | ✅ |
| `result_languages` | `result_id` | `NO ACTION` | ✅ |
| `result_levers` | `result_id` | `NO ACTION` | ✅ |
| `result_notable_references` | `result_id` | `NO ACTION` | ✅ |
| `result_oicrs` | `result_id` | `NO ACTION` | ✅ |
| `result_policy_change` | `result_id` | `NO ACTION` | ✅ |
| `result_pool_funding_alignment` | `result_id` | `NO ACTION` | ✅ |
| `result_pool_funding_indicator_mapping` | `result_id` | `NO ACTION` | ✅ |
| `result_pool_funding_toc_alignment` | `result_id` | `NO ACTION` | ✅ |
| `result_quantifications` | `result_id` | `NO ACTION` | ✅ |
| `result_regions` | `result_id` | `NO ACTION` | ✅ |
| `result_review_history` | `result_id` | `NO ACTION` | ✅ |
| `result_sdgs` | `result_id` | `NO ACTION` | ✅ |
| `result_strategic_objectives` | `result_id` | `NO ACTION` | ✅ |
| `result_tags` | `result_id` | `NO ACTION` | ✅ |
| `result_user_ai` | `result_id` | `NO ACTION` | ✅ |
| `result_users` | `result_id` | `NO ACTION` | ✅ |
| `submission_history` | `result_id` | `NO ACTION` | ✅ |
| `temp_result_ai` | `result_id` | `NO ACTION` | ✅ |

---

## 5. Divergence from `design.md` §0.3

**None.** Every measured figure matches the design’s recorded values, and the uncovered `NO ACTION` set is exactly the seven tables named. The §14 tripwire does not fire; T-02 may proceed.

---

## 6. Live `full_delete_result_version` — verbatim baseline

This is the authoritative baseline for T-02's `down()`. It was measured as identical in coverage to migration `1783029013035-UpdateDeleteAndVersionSp.ts`. Do **not** baseline on `1778510205765-updatefulldelete.ts` — it is superseded, and taking it as current is the error that invalidated revision 1.

```sql
CREATE DEFINER=`AllianceRepUser`@`%` FUNCTION `full_delete_result_version`(resultCode BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                        
                        DECLARE temp_result_id BIGINT;
                        
                        SELECT 
                        r.result_id
                            INTO
                        temp_result_id
                        FROM results r
                        WHERE  r.result_id  = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            RETURN FALSE;
                        END IF;

                        DELETE
                            FROM result_pool_funding_indicator_mapping
                            WHERE result_id = temp_result_id;

                        
                        DELETE
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 
                        

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE 
                            FROM result_levers 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institutions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_evidences 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_innovation_dev 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_actors 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institution_types 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_ip_rights 
                            WHERE result_ip_rights_id = temp_result_id;
                        
                        DELETE 
                            FROM result_capacity_sharing 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_policy_change 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_regions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_sdgs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_countries_sub_nationals
                            WHERE result_countries_sub_nationals.result_country_id IN (SELECT rc.result_country_id 
                        FROM result_countries rc
                        WHERE rc.result_id = temp_result_id	);
                            
                        DELETE 
                            FROM result_countries
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM result_languages
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM submission_history
                            WHERE result_id = temp_result_id;
                            
                                                DELETE
                            FROM result_pool_funding_alignment_sp
                            WHERE alignment_id IN (SELECT rpfa.id
                        FROM result_pool_funding_alignment rpfa
                        WHERE rpfa.result_id = temp_result_id);

                        DELETE
                            FROM result_pool_funding_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_pool_funding_toc_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_review_history
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM bulk_upload_results
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM temp_result_ai
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_cap_sharing_ip
                            WHERE result_cap_sharing_ip_id = temp_result_id;

                        DELETE
                            FROM TEMP_result_external_oicrs
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;
                       
                        RETURN TRUE;

                        
                    END
```

---

## 7. Live `delete_result` — the soft path being replaced

DELETE statements: **0** (body 7293 bytes). It is pure `UPDATE` — it sets `is_active = FALSE`, `deleted_at`, `result_status_id = 8` and leaves the row, with its `public_link`, in `results`. **This is the reported bug:** operators querying `results` still see the duplicate.

Relevant for T-07: the function contains no `COMMIT`, no DDL, and no `TRUNCATE`, so its DML participates in the caller's transaction and rolls back — which is what makes T-07's ordered transactional family deletion achievable.
