# Design — Innovation Dev card in the OICR selected-card style

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/dev-card-oicr-style` · Depth **Lite** |
| Requirements | [`./requirements.md`](./requirements.md) |
| Supersedes | `dev-card-details` `DD-6`, `DD-7`; `NFR-IUC-002` for the metadata-row roles |
| Date | 2026-09-10 |

---

## 2. Executive Summary

A template restructure plus two discarded fields recovered, one signal, one clear path, and a mechanical hex→token substitution. **No server change, no new component, no new token.**

---

## 3. Component architecture

One component changes: `innovation-use-details.component.{html,ts}`.

```
outer wrapper  (chrome: rs-mt/rs-p/border/bg-grey-100/rounded — UNCHANGED from today)
├── eyebrow row      icon + INNOVATION DEVELOPMENT                    ⊗ (right)
├── title            {{ formatInnovationDevLabel(devResult) }}
├── description      clamped + See more / See less
└── metadata row     <app-custom-tag> · level → n | year → y | scope → s
```

**Reuse, not invention** — the two elements that could have been hand-built already exist:

| Element | Reused from | Why |
| --- | --- | --- |
| Status badge | **`<app-custom-tag>`**, as used in `links-to-result.component.html:63-71` | Same domain (a *linked result's* status), and it takes `result_status.config.color.{text,background,border}` + `icon` **from the server**. `DD-2` |
| Metadata row shape | `oicr-form-fields.component.html` `#rows` (`:72-100`) | The approved pattern (`DD-1`) |

---

## 4. Data — everything is already on the picker option

`onInnovationDevSelected(resultId)` receives a `Result` that already carries **every** field the new card needs. It currently keeps four and discards the rest.

| Card field | Source | Today |
| --- | --- | --- |
| title, code, platform | `option` | ✅ kept |
| **status** | `option.result_status` (`ResultStatus` with `config?: StatusConfig`) | ❌ **discarded** |
| **year** | `option.year` | ❌ **discarded** |
| level, description, geo scope | `GET …/innovation-dev-card/:id` (shipped) | ✅ merged by T-09 |

**Change:** widen `linked_innovation_dev` with `result_status?` and `year?` — **optional**, exactly as `dev-card-details` T-06 required for its three keys, because the same four-key literal must keep compiling.

---

## 5. Design decisions

### `DD-1` — Restyle in place; do not extract a shared component

Option B (a shared `<app-selected-result-card>` used by both surfaces) is the better end state and is **rejected for tonight**: it changes a shipping OICR surface and needs its own regression pass. Recorded as the follow-up if the duplication bites a third time.

### `DD-2` — The badge is `<app-custom-tag>`, not the OICR card's button

The OICR pattern **hardcodes the literal `Published`** in a green-bordered button, because every OICR in that list is published. **Innovation Dev results are not**, so copying it would paint a `Draft` green.

Applying the user's *use-what-the-component-uses* rule to the **right** component: `links-to-result` renders a linked result's status with `<app-custom-tag>` driven by the server's own colour config. That is the same problem in the same domain, and it is what this card uses.

> **Reversion challenge (Step 2.3) — "what does removing the prose layout break?"**
> The reverted behaviour is `dev-card-details` `DD-6`/`DD-7` (prose, not a property list), which **is** test-covered by T-07's eight criteria and T-08's contrast assertions, and it has a visible surface. Challenge answer: nothing *functional* breaks — the description keeps its clamp, its `data-testid` seam and its `--ac-grey-800`; the `@if`-per-field rule survives verbatim as `R-OICR-001`'s absent-pair scenario. What breaks is **the tests that assert the old shape**, which is expected and is why `T-05` below rewrites them rather than deleting them. **No hidden dependency found.**

### `DD-3` — Clearing must also reset T-09's enrichment flag

This is the non-obvious half. `dev-card-details` T-09 added `enrichmentSuccessForId`, and `onInnovationDevSelected` early-returns when `sameId && wasSuccessful`.

**So clearing to `null` and re-picking the same result would early-return and render a bare card** — the exact dead-end class T-09's own review constructed. The clear path **must** set `linked_innovation_dev = null` **and** `enrichmentSuccessForId = null`.

`R-OICR-003`'s scenario asserts precisely this, and it is the one behaviour in this spec that a reasonable implementer would not think to test.

### `DD-4` — See more / See less is one signal, and the clamp stays CSS

A single `descriptionExpanded` signal toggles `line-clamp-3`. **The text is never sliced** — the full string stays in the DOM in both states (`R-OICR-004`, inherited `DD-6` prohibition).

### `DD-5` — Colours: adopt the pattern's tokens as-is

Per `NFR-OICR-002`. Every hex in the pattern has an **exact** existing token, so this is substitution, not design:

| Hex | Token | Role |
| --- | --- | --- |
| `#4c5158` | `--ac-grey-800` | title, description |
| `#345b8f` | `--ac-primary-blue-300` | metadata values |
| `#777c83` | `--ac-grey-700` | metadata labels |
| `#8d9299` | `--ac-grey-600` | eyebrow text |
| `#b9c0c5` | `--ac-grey-400` | `\|` separators |
| `#f58220` | `--ac-orange-1` | eyebrow icon |
| `#1689ca` | `--ac-light-blue-300` | link, if any survives |
| `#358540` / `#7cb580` | `--ac-green-500` / `--ac-green-300` | *not needed* — `<app-custom-tag>` supplies the badge's colours |

---

## 6. What this does NOT change

`link-results`, the picker query, the save payload (`buildPayload()` returns `InnovationUsePayload`, which has no `linked_innovation_dev` member — compiler-enforced), the endpoint, and `oicr-form-fields.component.html`.

---

## 7. Budget (Step 2.4 — `/akili-execute` trips against this)

| Metric | Estimate |
| --- | --- |
| **Tasks** | **5** |
| **LOC** | **~260** (≈ 90 production, ≈ 170 test) |
| **Review rounds** | **~7** |

**Depth re-check:** the design resolves to 5 tasks and ~260 LOC — **above a strict `Lite`** (1 task, minimal), below `Standard`. Kept at **Lite** deliberately: the five tasks are small, independent and share one component, and the deadline makes a heavier ceremony the wrong trade. **If execution needs a 7th task or passes ~400 LOC, that is the tripwire** — stop and escalate rather than absorbing it.

**Round budget is the figure to watch, not LOC.** The parent spec averaged 2.2 rounds per task; ~7 assumes 1.4, which is optimistic and is the number most likely to trip.
