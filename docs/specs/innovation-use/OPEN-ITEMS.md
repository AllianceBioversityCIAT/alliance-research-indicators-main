# Innovation Use — open items index

**Written 2026-08-21** as a session handoff, because the open items of this development live in **six** different places and no single command surfaces all of them.

> **This is a convenience index, not an authority.** Every row cites its authoritative home; if this file and the cited home disagree, **the home wins**. Re-derive rather than trust this file after any work lands.
>
> **`/akili-resume` covers rows in §2 and §3 only** — it scans active specs. It does **not** see the family manifest, the archived specs' owed follow-ups, or the filed platform findings in §4 and §5.

---

## 0. Hallazgos de la sesión de prueba — 2026-08-21, para retomar el lunes

Reportados por el product owner tras verificar el avance ya desplegado en **test**. **Ninguno bloquea lo desplegado**; los dos son trabajo nuevo.

### N-1 · El filtro "INNOVATION USE" del Results Center está inactivo — **causa raíz encontrada, arreglo de una línea**

El chip aparece en gris y no se puede seleccionar, mientras los otros indicadores sí. No es permisos ni datos: es una **allowlist hardcodeada en el cliente**.

```
client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.ts:419

    able: [0, 1, 2, 3, 4, 5].includes(indicator.indicator_id),
```

El indicador **6** (Innovation Use) no está en el arreglo, así que el chip se renderiza con `able = false` y el CSS lo pinta gris (`indicators-tab-filter.component.html`, clase `able`). El endpoint `indicators` del servidor **sí** devuelve el indicador 6 (`IndicatorsService.findAll()` solo filtra por `is_active`), o sea que el dato llega bien y el cliente lo descarta.

**Es exactamente el mismo patrón que ya corrigió `695b5248`** (*"fix(indicators.service): admit indicator 6 — the create-result entry point was closed all along"*): una lista fija a la que nadie le agregó el 6. Aquella era la del servidor para crear resultados; ésta es la del cliente para filtrar.

**Arreglo:** agregar `6` al arreglo. **Antes de darlo por cerrado**, buscar otras allowlists con la misma forma — este es el segundo sitio con el mismo defecto, así que asumir que son dos es repetir el error que ya se cometió una vez. Hay un test que cubre esta función (`results-center.service.spec.ts`), así que el cambio necesita actualizarlo.

### N-2 · La justificación no se limpia al bajar de nivel — **decisión de diseño, no solo un fix**

Si el nivel de uso cambia de uno que exige justificación (`>= 6`) a uno que no (p. ej. 2), el texto **se queda guardado en la base**. Queda un dato que no aplica: una justificación llena con nivel 2 no tiene sentido.

**Por qué pasa hoy, confirmado:** el cliente omite la clave `innovation_use_level_explanation` del `PATCH` cuando el campo no se tocó (`buildPayload`, **DD-3**), y el servidor hace *partial merge* en el paso 6 — una clave ausente llega como `undefined` y `UpdateQueryBuilder` de TypeORM la excluye del `SET`. O sea que el valor viejo **sobrevive por diseño**, y ese diseño es correcto para el caso que protege (`R-IUD-001` sc.1: *no debe borrar una justificación guardada cuando el campo nunca se tocó*). El problema es que el cambio de nivel es un disparador **distinto** que hoy nadie contempla.

**No es un bug funcional hoy, es higiene de datos.** El green check ya evalúa `IF(useLevel >= 6, explanationValid, TRUE)` (`1787078283929-createInnovationUseValidation.ts:134`), así que una justificación obsoleta en nivel 2 **no bloquea nada** — simplemente ensucia la base y puede confundir a quien lea los datos o construya reportes.

**Cuatro cosas a decidir antes de escribir código:**

1. **Dónde se limpia.** El servidor es el lugar seguro: es el sistema de registro y la API se puede llamar directo, así que limpiar solo en el cliente dejaría a cualquier consumidor de la API guardando datos inconsistentes.
2. **Qué pasa si el usuario baja y vuelve a subir el nivel** en la misma sesión. Limpiar al guardar significa que pierde el texto. Probablemente aceptable, pero es una decisión de producto, no técnica.
3. **⚠️ Interacción con el ítem D1 — mirar esto primero.** D1 (abajo) manda borrar `_effectiveExplanation` por código muerto. **Pero esa resolución es justamente la forma que necesita este cambio**: resolver el nivel efectivo y la explicación efectiva del *post-write row* para decidir si limpiar. Si se hace D1 primero, se borra código que habría que volver a escribir. **Decidir N-2 antes de ejecutar D1**, o ejecutar D1 sabiendo que esto vuelve.
4. **Filas ya inconsistentes.** ¿Se limpian las existentes con una migración de backfill, o solo aplica de aquí en adelante? Y ojo con el versionado: qué pasa con versiones ya aprobadas.

**Alcance acordado con el product owner: por ahora, solo el campo de justificación.** Otros campos condicionales pueden tener el mismo problema, pero no se abordan en este ciclo.

---

## 1. Where to start after a session reset

```
/akili-resume
```

Then, for the only unfinished task in an active spec:

```
/akili-execute bugfix/innovation-use-draft-save
```

Branch: **`AC-1679-Create-the-innovation-use-section`** — pusheada. **Actualizada con `staging`** (266 commits, 3 conflictos resueltos por union). El PR hacia `dev` sale de la rama de integracion **`AC-1679-to-dev`** (que absorbe `dev` para que la rama de feature no lo haga): **[PR #154](https://github.com/AllianceBioversityCIAT/alliance-research-indicators-main/pull/154)**, `MERGEABLE`. **El avance ya esta desplegado en test.** Punto de retorno: tag `backup/AC-1679-pre-staging-merge`.

---

## 2. Blocks the test deployment

| # | Item | Home | State |
| --- | --- | --- | --- |
| **B1** | **`SP_versioning` rollout** — two repair migrations must run **together, in order**, against the shared dev DB, **with Engineering-lead approval first**. The DB is shared and **not** disposable, so this is a human decision (root `CLAUDE.md` §4.3). The note also asks DevOps to confirm the run executes as `AllianceRepUser` (DEFINER), and warns that a **second** consecutive `migration:revert` can strand data | [`docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/devops-note.md`](../archive/2026-08-18-bugfix--sp-versioning-roles-id/devops-note.md) · family `FR-6` | **open** |
| **B2** | **Migration state of the target test environment** — unknown from the repo. The Innovation Use schema is evidently applied (a result was created and saved), but that is an inference from behaviour, not a verified fact about the target | DevOps | **unverified** |
| **B3** | **Deployment coupling — the one hard rule.** Ship **both tiers or neither**. Server-only changes nothing perceivable; **client-only turns today's silent no-op into a visible `400`**, i.e. strictly worse than the bug being fixed. Server deploys first per `docs/infrastructure.md`, which makes the intermediate window the harmless half | `bugfix/innovation-use-draft-save/design.md` §9 | **must be stated in the PR** |

---

## 3. Active specs — unfinished tasks

### 3.1 `bugfix/innovation-use-draft-save`

| # | Item | State |
| --- | --- | --- |
| ~~**T-03**~~ | ✅ **HECHO** 2026-08-21 — Reviewer PASS en el intento 3 de 3. ~~Amend the affected specs and close the verification gate: Pivot `details-page` (R-IUP-006 AC.2, `design.md:380`, `tasks.md:428`, T-09 c5, the traceability row), write a **superseding record** for archived chunk 2's `R-IUA-006` AC.3/AC.4 (**do not edit the archived file**), add a follow-up row to `family.md`, file the platform finding, run Correction Closure both directions, and run both full suites in a quiet window~~ | **`[x]` cerrado** |
| **D1** | **Deferred by user ruling** — remove `_effectiveExplanation` (dead since T-01) plus three stale rationale paragraphs at `result-innovation-use.service.ts:263-264`, `:269-271`, `:278-284`, and the now-false comment at `innovation-use-section-round-trip.fixture-spec.ts:992-994`. **Zero functional effect.** `tasks.md` T-01 scope item 1 is already amended to permit it | **deferred, not dropped** |
| **D2** | **Deferred by user ruling · `ADVISORY R1` · highest-value item owed.** Nothing asserts that `result_status_workflow` **row id 30** dispatches `completenessValidation` with `enabled: true`. A future migration flipping it would leave **every test in this spec green** while removing the last server-side completeness enforcement for the section. **Test-only** close: a raw `SELECT` of row 30's config in `innovation-use-level-boundary.fixture-spec.ts`. It is the **only unasserted premise in R-IUD-002's chain** | **deferred — pick up first** |

### 3.2 `innovation-use/details-page` — **T-13 is `[~]`**

| # | Item | State |
| --- | --- | --- |
| **H1** | **T-13 c1** — end-to-end in **one pass**: open an indicator-6 result **from the sidebar**, fill, save, re-read, and watch the **sidebar tick flip**, plus Back → `alliance-alignment` and Next → `partners` each preserving `?version=N`. **Partially exercised** on 2026-08-21 (a result was created and saved successfully), but the criterion is explicit that satisfying it via sub-checks is *not* satisfied | **owed** |
| **H2** | **T-13 c7** — human visual check, **light theme only** (dark dropped by **DD-14**), at **1440 px** and the project `md:` breakpoint (landscape, height ≤ 768 px). **Quote what was observed.** Also check **one unrelated result tab**, because `form-header` renders on 13 pages and its typography changed when `rs-*` began resolving | **owed** |
| **H3** | **T-13 c8** — T6-Multimodal screenshot review, **two** screenshots (light × two viewports). Capture them and hand over the paths; an assistant with vision can discharge it | **owed** |
| **H4** | **T-13 c9** — keyboard pass: focus order, visible ring, **no focus trap inside a repeatable card**, English accessible name on every icon-only control | **owed** |
| **RB-1** | `OQ-IUP-4` — is adding a token to `colors.scss` acceptable inside this spec, or a separate design-system change? Gates **T-11 c4** only | **open** |
| **RB-5** | The promoted `quantification-item` template carried **four hex literals** into `shared/` (`bg-[#F4F7F9]`, `border-[#E8EBED]`, `text-[#8D9299]`, `text-[#CF0808]`). Bounded and named rather than remediated inside a move task | **owed follow-up** |
| **RB-7** | `judgment.md` findings **I-2**, **I-3**, **I-5** remain open by explicit user scope decision | **deferred** |
| **RB-8** | **Three findings from T-10's Pivot, none in T-10's scope:** (a) the `as keyof GreenChecks` cast is still open (~10 lines, inside files T-10 already owns); (b) and (c) **two live production bugs found in unrelated code** | **open** |
| **RB-3 / RB-4** | **Accepted risks, not work.** `AR-1` — no client-tier test reaches a live API. `AR-2` — visual and a11y correctness rest on human observation | **accepted, stated** |

---

## 4. Family level — needs its own spec

| # | Item | Home | State |
| --- | --- | --- | --- |
| **F1** | **`FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718) — the biggest open item in this family.** `customSaveInnovationDev` accepts a caller-supplied primary key with **no ownership check**, so any authenticated principal who can edit *some* indicator-2 result can rewrite **any** `result_actors` / `result_institution_types` row by id — including the Innovation Use rows chunk 2 protected. Chunk 2 built **four** protections on its own endpoint; the Dev endpoint has **none**. Read the exposure precisely: **the guard is a property of the endpoint, not of the data**, so platform exposure is **asymmetric** and easy to mis-summarise as "fixed". Needs its own **Lite/Bug-Mode** spec with a red-before-green fixture per variant, and a migration-grade human review gate — the Dev path's ACs are unwritten and its data is live | `family.md` `FR-7` | **OPEN, High** |
| **F2** | **`G-3`** — an e2e project pointed at the scratch container. Owed from chunk 2; it is what would unblock that spec's `T-01 c1` | `family.md` §Handoff | **owed** |
| **F3** | **`C-4`** — a fixture *code* change carried from chunk 1, and found **over-broad as logged**: only the sites guarding rows `global-setup.ts` seeds are dead; those guarding a private platform code are **live teardown guards**. Still needs a scope ruling | `family.md` chunk 1 row · `details-api/design.md` §11.1 | **needs ruling** |
| **F4** | **`OQ-F4`** — `docs/specs/general-setup/family.md` does not exist; should it be authored so future families share one schema? Methodology hygiene, blocks nothing | `family.md` `OQ-F4` | **open** |
| **F5** | **Investment / co-investment USD tables** — three tables ruled **family non-goals** by the product owner on 2026-08-14. The third (**partner co-investment**) was a genuine contradiction in the user story — the Context paragraph excluded it, the field list included it — and the ruling was to exclude, **"revisit as a fourth chunk if reinstated"**. That is the one with a defined route back | `family.md` §Family Non-Goals | **Won't (this cycle)** |

---

## 5. Filed findings — no spec, owner named

| # | Item | State |
| --- | --- | --- |
| **P1** | **`completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for *every* indicator** (`result_status_workflow` rows 1, 7, 13, 19, 25; only the `REVISED → SUBMITTED` rows have it `true`). So **any API client can submit an incomplete result on a first submission**; only the STAR client's green-check gating prevents it, and that is client-side. Whether this is deliberate (first submit may be incomplete by design) or a config never switched on is **unknown from the repo**. Needs a product/security answer. **Deliberately not fixed inside a bugfix** — if that gate belongs on, it belongs on for all six indicators | `bugfix/innovation-use-draft-save/proposal.md` §15 |
| **P2** | **Dark mode is unreachable** — `DarkModeService` is imported and injected at `alliance-navbar.component.ts:22,52` but appears in **no template**. A dead injection. This is what justified **DD-14**'s deferral of dark-mode verification; the §5.7 contrast defect (**1.29:1** and **1.887:1** against 4.5:1) is real but sits in an unreachable state. **If a toggle is ever exposed, `T-13` c7/c8 revert to both themes and that defect becomes blocking** | `details-page/design.md` **DD-14** · `execution.md` → *Dark-mode deferral* |
| **P3** | The navbar injects a service it never uses — dead code in a shared component. Recorded, not minted as work | `details-page/execution.md` → *Dark-mode deferral* |

---

## 5b. Pendientes surgidos del despliegue a test — 2026-08-21

| # | Item | Dueño / estado |
| --- | --- | --- |
| **S-1** | **Quality Gate de SonarCloud en rojo en el PR #154**, aprobado por el lider para corregir en un PR aparte. **Todo lo rojo es nuestro** (verificado: el gate mide *New Code* = el diff contra la base, asi que es estructuralmente imposible que reporte deuda heredada de `dev`). Los 4 bugs CRITICAL son la misma regla `S2871` (`.sort()` sin comparador) en `innovation-use-result-creation.fixture-spec.ts:697,708,711,722`; las 2 vulnerabilidades MINOR son avisos de `PATH` en `scripts/load-baseline.js:80,94`. **Cero hallazgos en codigo fuente del servidor.** **Causa raiz verificada:** el workflow excluye `**/*.spec.ts`, pero los 13 fixtures se llaman `*.fixture-spec.ts` — terminan en `-spec.ts`, no en `.spec.ts`, asi que el glob no los alcanza y Sonar los analiza como produccion. **Arreglo recomendado: una linea** en `.github/workflows/sonarcloud-analysis-backend.yml` agregando `**/*.fixture-spec.ts,**/scripts/**` a las exclusiones — ataca las tres condiciones a la vez y evita que reaparezca con cada fixture nuevo. Diagnostico completo comentado en el PR | **abierto**, PR aparte |
| **S-2** | **Colision de IDs en `docs/specs/kaizen-log.md`** — las dos lineas de trabajo evolucionaron el registro en paralelo y asignaron **los mismos IDs a lecciones distintas** (`KZ-002`, `KZ-007`, `KZ-008` no significan lo mismo en cada lado; `KZ-001` si es la misma leccion y la de `staging` esta mas evolucionada: recurrencia 13 vs 4). Fusionar por ID haria que **cada cita `KZ-00x` de los specs del otro linaje apunte a la leccion equivocada**. Las dos tablas quedaron separadas por linaje con una advertencia visible. **Necesita decision humana**, no hay resolucion mecanica correcta | **abierto** |
| **S-3** | **Deuda heredada de `dev` — NO tocar dentro de nuestros PRs.** (a) El arbol de `dev` no pasa su propio lint: **181 errores de Prettier** en 9 archivos, con config identica en ambas ramas (probado: sobre `AC-1679` post-`staging`, `lint --fix` produjo cero mutaciones). **El CI corre `npm run build`, no lint, y el build pasa.** Cuidado: `npm run lint` lleva `--fix` y **muta archivos**, incluida una migracion (append-only) — revisar `git status` despues de correrlo. (b) **`migration:scan`** apunta a `scripts/scan-migration-placeholders.js`, borrado el 2026-08-13 por `2c50e1f1`, que no quito el entry de `package.json`; ya reportado 3 veces en la documentacion de `staging` (*"Not fixed; needs an owner"*). Lo mismo con **`migration:show`**, que las guias mencionan pero no existe como script npm — el comando real es `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts`. (c) **Worker leak de Jest** en la suite del servidor, ausente antes del merge con `dev` y presente despues; los 3158 tests siguen pasando | **de `dev`**, dueño propio |

---

## 6. Recurring process lesson worth acting on

**`KZ-005` recurred three times in the 2026-08-21 session alone**, always the same shape: a correction's **cited-site list under-counted**, and the **forward sweep** — not the analysis — found the survivors.

| Occurrence | Cited | Actually live |
| --- | --- | --- |
| Indicator-6 allowlist Pivot | 6 sites | **+2** (`requirements.md` §Why-now, `proposal.md:40`) |
| R-IUD-003 suppression prescription | 1 site | **4** |
| T-01's inverted-test list | 5 lines | **+3 sites and a whole file** |

The lesson's own escalation is the fix: **fewer sites asserting the same derived fact, not better sweeps.** Worth a Kaizen entry the next time `/akili-archive` runs.
