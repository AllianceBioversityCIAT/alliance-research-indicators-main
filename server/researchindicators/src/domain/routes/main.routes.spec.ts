import { Routes } from '@nestjs/core';
import { route } from './main.routes';
import { ResultInnovationUseModule } from '../entities/result-innovation-use/result-innovation-use.module';
import { ControlListsModule } from '../entities/control-lists/control-lists.module';
import { PrmsWebhookCallbackModule } from '../entities/prms-webhook/prms-webhook-callback.module';
import { PrmsWebhookModule } from '../entities/prms-webhook/prms-webhook.module';

/**
 * T-07 (R-IUA-013 AC.5). No other node in this route tree is covered by a
 * spec — route registration in this repo is otherwise verified only by
 * `npm run build` / e2e / human inspection. This file exists solely
 * because the mutation sweep showed deleting the `innovation-use` node
 * leaves every other check green: nothing else in the suite notices a
 * missing route.
 */
describe('main.routes — results/innovation-use registration', () => {
  it('registers ResultInnovationUseModule under results as innovation-use', () => {
    const resultsNode = (route as Routes).find(
      (node) => (node as { path?: string }).path === 'results',
    ) as { children?: Routes };

    expect(resultsNode).toBeDefined();
    expect(resultsNode.children).toBeDefined();

    const innovationUseNode = resultsNode.children.find(
      (node) => (node as { path?: string }).path === 'innovation-use',
    ) as { module?: unknown };

    expect(innovationUseNode).toBeDefined();
    expect(innovationUseNode.module).toBe(ResultInnovationUseModule);
  });
});

/**
 * T-01 (docs/specs/institutional-performance/control-lists), KZ-017: a route
 * node is not a registration on its own (RouterModule.register() looks the
 * module up in modulesContainer and returns silently when absent) — the
 * companion gate is `entities.module.spec.ts`'s membership assertion. This
 * spec is the falsifiable check over the route *tree* node itself.
 */
describe('main.routes — control-lists registration (T-01)', () => {
  it('registers ControlListsModule at path control-lists', () => {
    const controlListsNode = (route as Routes).find(
      (node) => (node as { path?: string }).path === 'control-lists',
    ) as { module?: unknown };

    expect(controlListsNode).toBeDefined();
    expect(controlListsNode.module).toBe(ControlListsModule);
  });
});

/**
 * T-03 (design.md DD-3, P-13 / R-PWH-004 AC.3). `prms-webhook` (this task —
 * the SYSTEM_ADMIN registration surface) must be a TOP-LEVEL entry, and
 * disjoint from `prms-callback` (T-04, public, secret-authenticated):
 * neither prefix may be a glob-match of the other, or the JwtMiddleware
 * exclusion built for one would swallow the other (the exact failure this
 * repo already paid for once — see main.routes.ts's bilateral-project-
 * mappings comment / execution.md Pivot Record #1).
 */
describe('main.routes — prms-webhook registration (T-03)', () => {
  it('registers PrmsWebhookModule as a TOP-LEVEL prms-webhook entry', () => {
    const prmsWebhookNode = (route as Routes).find(
      (node) => (node as { path?: string }).path === 'prms-webhook',
    ) as { module?: unknown; children?: Routes } | undefined;

    expect(prmsWebhookNode).toBeDefined();
    expect(prmsWebhookNode.module).toBe(PrmsWebhookModule);
  });

  it('registers PrmsWebhookCallbackModule as a TOP-LEVEL prms-callback entry', () => {
    const prmsCallbackNode = (route as Routes).find(
      (node) => (node as { path?: string }).path === 'prms-callback',
    ) as { module?: unknown; children?: Routes } | undefined;

    expect(prmsCallbackNode).toBeDefined();
    expect(prmsCallbackNode.module).toBe(PrmsWebhookCallbackModule);
    expect(prmsCallbackNode.children).toBeUndefined();
  });

  it('is disjoint from prms-callback — neither path is a prefix of the other', () => {
    const topLevelPaths = (route as Routes)
      .map((node) => (node as { path?: string }).path)
      .filter((path): path is string => typeof path === 'string');

    expect(topLevelPaths).toContain('prms-webhook');
    expect(topLevelPaths).toContain('prms-callback');
    expect(
      topLevelPaths.filter((path) => path === 'prms-webhook'),
    ).toHaveLength(1);
    expect(
      topLevelPaths.filter((path) => path === 'prms-callback'),
    ).toHaveLength(1);
    expect('prms-webhook'.startsWith('prms-callback')).toBe(false);
    expect('prms-callback'.startsWith('prms-webhook')).toBe(false);
  });
});
