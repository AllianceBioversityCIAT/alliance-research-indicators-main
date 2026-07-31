// @akili-spec project-dashboard/indicator-metadata-charts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractService } from './agresso-contract.service';

/**
 * Gate for **DC-10 (Swagger drift)** — until now a purely manual check.
 *
 * The defect this closes is **silent**: a response DTO that no handler references
 * is not emitted into the OpenAPI document *at all*, however many `@ApiProperty`
 * decorations it carries, because `createDocument` reaches models only by
 * traversing route response metadata. Nothing fails — the page simply renders
 * without the schema. That is exactly what `reports/full` did before T-09
 * (`execution.md` § T-09 records the measured before/after), and it is why
 * R-IMC-012 AC.1 had to be rewritten to name the handler decorator rather than
 * the DTO's properties.
 *
 * **Deliberately narrow, per the T-09 review's scope constraints.** It asserts
 * two document-level facts that are cheap and stable:
 *   1. the `reports/full` 200 response carries a `$ref` at all, and
 *   2. no `$ref` anywhere in the document dangles.
 *
 * It does **not** assert the DTO's field names or count. That would duplicate the
 * DTO and turn a useful gate into a maintenance tax on every additive change —
 * converting a guard into churn. The field-level contract is already enforced
 * where it belongs: `ContractFullReportsDto implements IndicatorMetadataSectionsDto`
 * makes a missing or misnamed section a **compile** error (T-02).
 *
 * The `{}` service stub is sound: `createDocument` is pure static metadata
 * introspection and never invokes the service — it only needs DI to satisfy the
 * controller's constructor.
 */
describe('AgressoContractController — OpenAPI emission (DC-10)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AgressoContractController],
      providers: [{ provide: AgressoContractService, useValue: {} }],
    }).compile();

    app = moduleRef.createNestApplication();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('emission gate').setVersion('1').build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  /** Every `$ref` target in the document, wherever it is nested. */
  const collectRefs = (node: unknown, found: string[] = []): string[] => {
    if (Array.isArray(node)) {
      for (const item of node) collectRefs(item, found);
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
      )) {
        if (key === '$ref' && typeof value === 'string') found.push(value);
        else collectRefs(value, found);
      }
    }
    return found;
  };

  const reportsFullPath = (): string => {
    const match = Object.keys(document.paths).find((p) =>
      p.endsWith('reports/full'),
    );
    // The route prefix (`/api/v1/agresso/contracts`) comes from
    // `domain/routes/main.routes.ts`, which a controller-only harness does not
    // mount — so match on the suffix rather than pinning the full path.
    expect(match).toBeDefined();
    return match as string;
  };

  it("emits a schema $ref on reports/full's 200 response — an unreferenced DTO would be absent entirely", () => {
    const operation = document.paths[reportsFullPath()].get;
    expect(operation).toBeDefined();

    const ok = operation?.responses?.['200'] as {
      content?: Record<string, { schema?: unknown }>;
    };
    expect(ok).toBeDefined();

    const schema = ok.content?.['application/json']?.schema;
    // Without `@ApiOkResponse` the 200 is `{ description: '' }` — no `content`,
    // no schema. This is the assertion that reddens for that state.
    expect(schema).toBeDefined();
    expect(collectRefs(schema).length).toBeGreaterThan(0);
  });

  it('leaves no dangling $ref — every referenced schema is emitted', () => {
    const emitted = Object.keys(document.components?.schemas ?? {});
    const dangling = [...new Set(collectRefs(document))]
      .map((ref) => ref.replace('#/components/schemas/', ''))
      .filter((name) => !emitted.includes(name));

    // A document full of dangling refs looks populated and renders broken —
    // referenced-but-absent is the failure mode a page-eyeball check misses.
    expect(dangling).toEqual([]);
  });
});
