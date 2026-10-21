# AGROVOC search fixtures

Captured 2026-10-19 from the public search API (no auth). Row objects are the parsed `results` entries from that response; only rows were dropped.

```bash
curl -sS 'https://agrovoc.fao.org/browse/rest/v1/search/?query=*training*&lang=en'
curl -sS 'https://agrovoc.fao.org/browse/rest/v1/search/?query=*bea*&lang=en'
```

| File                    | What was kept                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `training-results.json` | All 18 `results` rows. HTTP 200 on retry (first attempt 503). Still contains two `skill training` rows (one without `altLabel`, one via `skills training`) and two `e-learning` rows (`online training`, then `Web-based training`). |
| `bea-25-concepts.json`  | Prefix of the `*bea*` `results` array (200 rows, HTTP 200) stopped at 25 distinct `uri` values: 28 rows kept, later rows dropped.                                                                                                    |
