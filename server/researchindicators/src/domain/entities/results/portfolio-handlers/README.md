# Portfolio handlers — alignment (Results module)

Scaffold for portfolio-specific **alignment save/read** without changing `ResultsController` HTTP routes.

## Intended flow

```text
ResultsController
  PATCH / GET .../alignments
        ↓
ResultsService.updateResultAlignment() / findResultAlignment()
        ↓
ResultSectionOrchestratorService
        ↓
AlignmentHandlerRegistry.get(portfolioId)
        ↓
Portfolio1AlignmentHandler | Portfolio2AlignmentHandler
```

## Structure

```text
portfolio-handlers/
├── enum/
│   ├── portfolio-id.enum.ts
│   └── result-section-key.enum.ts
├── core/
│   ├── portfolio-handler-context.interface.ts
│   ├── portfolio-section-handler.interface.ts
│   └── abstract-section-handler.registry.ts
├── application/
│   └── result-section-orchestrator.service.ts
├── sections/
│   └── alignment/
│       ├── alignment-section-handler.interface.ts
│       ├── alignment-handler.registry.ts
│       ├── portfolio-1/portfolio-1-alignment.handler.ts
│       └── portfolio-2/portfolio-2-alignment.handler.ts
└── portfolio-handlers.module.ts
```

## Portfolios

| ID | Enum | Years (seed) |
| --- | --- | --- |
| 1 | `PORTFOLIO_1` | 2021–2025 — legacy behaviour |
| 2 | `PORTFOLIO_2` | 2026–2030 — new variants |

## Next steps

1. Move current `ResultsService.updateResultAlignment` / `findResultAlignment` logic into `Portfolio1AlignmentHandler` (or a shared operations service).
2. Implement portfolio 2 differences in `Portfolio2AlignmentHandler`.
3. Implement delegation in `ResultSectionOrchestratorService`.
4. Import `PortfolioHandlersModule` in `ResultsModule`.
5. Add specs per handler (`portfolio-1-alignment.handler.spec.ts`, etc.).

## Adding another section later

Copy `sections/alignment/` as a template under `sections/<new-section>/` and register providers in the module.
