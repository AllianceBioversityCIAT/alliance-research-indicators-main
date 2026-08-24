# Proposal — Dashboard Narrative Pass (Project Dashboard v3.1)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/dashboard-narrative-pass/` |
| Slug | `dashboard-narrative-pass` — derived from free-text argument (3 hallazgos del owner sobre coherencia visual, chart vacío y jerarquía narrativa) |
| Type | Change (con sub-track Bug embebido — diagnosis-first) |
| Approval Mode | gated |
| Depends on | none (familia `project-dashboard-v3` completa y archivada 2026-08-24 — este spec la extiende, no la modifica) |
| Parallel-safe | no (toca el layout completo de project-dashboard) |
| Date | 2026-08-24 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Proposed |

## 2. Intent

Cerrar la brecha entre lo construido (v3, 4 specs) y lo que el PI percibe: (a) unificar el lenguaje visual de las gráficas que hoy mezclan barras HTML custom con viz-chart/echarts, (b) arreglar el chart "Results over time" que renderiza ejes sin serie, y (c) reordenar la página como una narrativa de datos — cada gráfica responde una pregunta y el orden cuenta una historia, no una lista de widgets desconectados.

## 3. Problem / Current Behavior (evidencia: 3 screenshots del owner, 2026-08-24)

1. **Mezcla de idiomas visuales (imgs #46/#47).** Inventario verificado en código:
   - "Results by status": barra de composición + pills = **HTML custom inline** en `project-dashboard.component.html:383-440` (divs con `[style.width.%]`, a11y completa — construcción deliberada de F1/F2, no chart.js residual).
   - `project-dashboard-card` (Top partner/levers/contact…): **mixto** — usa `app-viz-chart` Y pills custom (`[style.width.%]` líneas 95/160).
   - Top Regions/Countries (#47): pills custom (inventario exacto por-superficie pendiente en specify — KZ-002: enumerar por lo que renderiza).
   - `chart.js` NO está en dependencias (verificado package.json) — es *apariencia* de librería vieja, no la librería.
2. **BUG — "Results over time" vacío (img #48).** Hechos confirmados por código: el card recibe ≥2 buckets válidos (los ejes pintan 3 años, y-max 12 ⇒ rama `hasChart`), la serie línea/símbolos no se dibuja. `VisualMapComponent` SÍ está registrado (descartado). **Sospechoso principal (no confirmado):** `results-trend-card.component.ts` usa `visualMap.pieces[].lineStyle` — propiedad no estándar de visualMap; un visualMap activo anula el visual de la serie y unos pieces sin visual reconocido pueden dejar la línea sin color. **Causa raíz pendiente de confirmación runtime** — primera tarea del spec: reproducir y asertar sobre el SVG renderizado (KZ-001: la propiedad vive en el output generado), luego regression test rojo→verde.
3. **Jerarquía sin narrativa.** Orden actual (F1 + apéndices F3/F4): hero → trend+status → geo → rankings/SP → deep-dive → insights → pending. Funciona por bloques pero no responde preguntas en secuencia; cards vecinas no se contestan entre sí.

## 4. Proposed Outcome

### 4a. Un solo idioma visual
Toda visualización de datos pasa por `viz-chart` (echarts SVG, tokens `--ac-viz-*`, tableModel) O se declara explícitamente idioma "KPI/composition strip" en design.md §8 con criterio de cuándo usar cada uno. Fin del mixto por accidente.

### 4b. Results over time correcto
Serie visible con la semántica original (sólida hasta el año cerrado, punteada el año en curso) — vía fix del mecanismo confirmado (candidato: dos series solapadas en vez de visualMap piecewise, precedente T-09 que ya evitó visualMap) + regression test sobre SVG generado.

### 4c. Orden narrativo (data-storytelling, propuesta inicial — mockup en specify)

| Acto | Pregunta que responde | Contenido |
|---|---|---|
| 1. Identidad y salud | ¿Qué es este proyecto y cómo va? | Hero unificado (KPIs + status composition + contexto) — status SUBE al hero como semáforo, no card aparte |
| 2. Producción | ¿Cuánto se ha producido y cuándo? | Results over time (arreglado) + por indicador |
| 3. Alcance | ¿Dónde y con quién? | Geo (mapa+top-N) + partners + contactos |
| 4. Dirección | ¿Hacia qué apunta? | Levers/SP alignment + SDG coverage (chips F4 suben de acto) |
| 5. Calidad y proceso | ¿Qué tan sólido es lo reportado? | Evidence + review flow + reach (F4) |
| 6. Profundidad | ¿Qué hay detrás de cada indicador? | Deep-dive F3 (lazy) + keywords/tema (F4) + pending table |

Regla narrativa: cada card lleva subtítulo-pregunta; cards del mismo acto comparten fila/grupo visual; lazy sections mantienen sus reglas F3/F4 (sin costo de first-paint).

## 5. Scope

- **Client only** — cero cambios de API/DTO (los endpoints v3 ya sirven todo).
- Migración/declaración de idioma de las 3 superficies custom-bar; fix + regression test del trend; reordenamiento del template + subtítulos; HITL light+dark final.

## 6. Non-Goals

- Nuevas métricas o endpoints; cambios server; tocar los specs archivados (point-in-time); rediseño de tokens; NgRx/nuevas librerías de charts.

## 7. Affected Users, Systems, And Specs

- **Usuarios:** PIs, M&E, center admins. **Sistema:** client `project-detail` únicamente.
- **Specs:** extiende (sin editar) los archives de la familia v3; design.md §8 (registro de componentes) se actualizará vía el flujo normal.

## 8. Visual Reference

- Source: 3 screenshots del owner (en sesión, 2026-08-24: status card, top-N pills, trend vacío) + **mockup recomendado en specify** (HTML autocontenido bajo `mockup/`, precedente F3).
- Location: pendiente de specify.
- Notes: el mockup debe mostrar los 6 actos con datos reales de un contrato denso (A511/A1048).

## 9. Requirement Delta Preview

### ADDED
- Regla de idioma visual único (o dual declarado) en design.md §8; subtítulos-pregunta por card; orden narrativo de 6 actos.

### MODIFIED
- Layout/orden de `project-dashboard.component.html`; render de status/top-N (si migran a viz-chart); `results-trend-card` (fix).

### REMOVED
- Nada funcional; potencialmente el markup custom-bar si migra.

## 10. Bug Diagnosis (sub-track del hallazgo 2)

- **Observed Symptom:** "Results over time" pinta ejes (2024-2026, y-max 12) sin línea ni símbolos; el resto de charts del mismo card-familia renderiza.
- **Reproduction:** dashboard de un contrato con ≥2 report years (el del screenshot: 21 results, 12 Draft / 9 Completed in TIP).
- **Root Cause:** **NO CONFIRMADA** — descartado: `VisualMapComponent` no registrado (SÍ está, `viz-chart.component.ts:72`); descartado: datos vacíos (ejes con categorías ⇒ `hasChart`). Candidato principal: `visualMap.pieces[].lineStyle` no estándar anulando el visual de la serie. Confirmación = primera tarea del spec (aserción sobre SVG generado, KZ-001).
- **Impact:** un PI ve un chart "roto" en el acto de producción — daña la confianza en todo el dashboard.
- **Fix Strategy:** `/akili-specify` en Bug Mode para este workstream (regression test rojo→verde obligatorio); NO `/akili-quick` (lógica de rendering).

## 11. Approach Options

| Opción | Descripción | Trade-off |
|---|---|---|
| **A (recomendada)** | Un spec, 3 workstreams: fix del trend (Bug Mode) → migración/declaración de idioma → reorden narrativo con mockup aprobado | Cambio acotado client-only; el mockup gate evita improvisar UX; ~1 spec Full |
| B | Solo bug + reorden; declarar las custom bars como idioma oficial sin migrar | Menor costo; deja el mixto de project-dashboard-card sin resolver |
| C | Rediseño v4 completo (nueva familia) | Desproporcionado: los datos y endpoints ya existen; esto es presentación |

**Recomendada: A.**

## 12. Risks, Dependencies, And Open Questions

- **KZ-002:** el inventario custom-vs-viz debe enumerarse por lo que RENDERIZA cada superficie, no por carpeta (el status card vive inline en el template padre).
- **KZ-001/KZ-014:** el fix del trend se prueba sobre SVG generado + HITL con screenshots; presencia de options ≠ render.
- **OQ-1:** ¿el "status al hero" (acto 1) cabe sin romper el hero de F1, o el semáforo va como strip bajo el hero? — decidir en specify con mockup.
- **OQ-2:** ¿migrar las top-N pills a viz-chart o declararlas idioma "ranking strip"? Ambas legítimas; el mockup decide por comparación visual.
- Riesgo bajo de regresión F3/F4: las secciones lazy solo se re-posicionan, sus contratos no cambian.

## 13. Success Criteria

- Results over time visible y correcto (test de regresión verde + HITL).
- Cero superficies con idioma visual sin declarar (inventario cerrado en design.md §8).
- Orden narrativo aprobado por mockup e implementado; first-paint requests sin cambio; suites/build/budgets verdes; HITL light+dark.

## 14. Next Step

```text
/akili-specify changes/dashboard-narrative-pass
```
*(Full depth; workstream 1 en Bug Mode; mockup gate antes de tasks.)*
