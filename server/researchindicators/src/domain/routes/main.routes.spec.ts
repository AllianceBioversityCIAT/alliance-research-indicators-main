import { Routes } from '@nestjs/core';
import { route } from './main.routes';
import { ResultInnovationUseModule } from '../entities/result-innovation-use/result-innovation-use.module';
import { ControlListsModule } from '../entities/control-lists/control-lists.module';

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
