import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultStatusWorkflow } from './entities/result-status-workflow.entity';
import { StatusTransitionTree } from './satus-graph';

function status(
  id: number,
  name: string,
  extra: Partial<ResultStatus> = {},
): ResultStatus {
  return {
    result_status_id: id,
    name,
    description: `desc-${id}`,
    editable_roles: [1],
    config: {},
    action_description: `act-${id}`,
    ...extra,
  } as ResultStatus;
}

function transition(
  fromId: number,
  toId: number,
  fromS: ResultStatus,
  toS: ResultStatus,
): ResultStatusWorkflow {
  return {
    from_status_id: fromId,
    to_status_id: toId,
    from_status: fromS,
    to_status: toS,
  } as ResultStatusWorkflow;
}

describe('StatusTransitionTree', () => {
  it('builds nodes, roots, leaves and paths for a linear workflow', () => {
    const s1 = status(1, 'Draft');
    const s2 = status(2, 'Review');
    const s3 = status(3, 'Done');
    const transitions = [transition(1, 2, s1, s2), transition(2, 3, s2, s3)];

    const tree = new StatusTransitionTree(transitions);
    const graph = tree.getGraph();

    expect(graph.nodes.size).toBe(3);
    expect(graph.rootNodes.map((n) => n.statusId)).toEqual([1]);
    expect(graph.leafNodes.map((n) => n.statusId)).toEqual([3]);
    expect(graph.paths).toEqual([['Draft', 'Review', 'Done']]);
  });

  it('deduplicates parallel edges between the same pair', () => {
    const s1 = status(1, 'A');
    const s2 = status(2, 'B');
    const t1 = transition(1, 2, s1, s2);
    const t2 = transition(1, 2, s1, s2);
    const tree = new StatusTransitionTree([t1, t2]);
    const from = tree.getPossibleTransitionsFrom(1);

    expect(from).toHaveLength(1);
    expect(from[0].statusId).toBe(2);
  });

  it('exposes transitions from / to and path search', () => {
    const s1 = status(1, 'A');
    const s2 = status(2, 'B');
    const s3 = status(3, 'C');
    const transitions = [transition(1, 2, s1, s2), transition(2, 3, s2, s3)];
    const tree = new StatusTransitionTree(transitions);

    expect(tree.getPossibleTransitionsFrom(2).map((n) => n.name)).toEqual([
      'C',
    ]);
    expect(tree.getPossibleTransitionsTo(2).map((n) => n.name)).toEqual(['A']);
    expect(tree.hasPath(1, 3)).toBe(true);
    expect(tree.hasPath(3, 1)).toBe(false);
    expect(tree.getPossibleTransitionsFrom(999)).toEqual([]);
    expect(tree.hasPath(1, 1)).toBe(true);
  });

  it('getStatistics and toMermaidDiagram summarize the graph', () => {
    const s1 = status(1, 'One');
    const s2 = status(2, 'Two');
    const tree = new StatusTransitionTree([transition(1, 2, s1, s2)]);

    const stats = tree.getStatistics();
    expect(stats.totalStates).toBe(2);
    expect(stats.totalTransitions).toBe(1);
    expect(stats.rootNodes).toEqual(['One']);
    expect(stats.leafNodes).toEqual(['Two']);
    expect(stats.possiblePaths).toBe(1);

    const mermaid = tree.toMermaidDiagram();
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('1["One"]');
    expect(mermaid).toContain('2["Two"]');
    expect(mermaid).toContain('1 --> 2');
  });

  it('getHierarchicalTree mirrors transitions from root nodes', () => {
    const s1 = status(1, 'Root');
    const s2 = status(2, 'Child');
    const s3 = status(3, 'Leaf');
    const tree = new StatusTransitionTree([
      transition(1, 2, s1, s2),
      transition(2, 3, s2, s3),
    ]);

    const [root] = tree.getHierarchicalTree();

    expect(root.id).toBe(1);
    expect(root.canTransitionTo).toEqual([2]);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe(2);
    expect(root.children[0].children[0].id).toBe(3);
  });

  it('marks circular reference when a node repeats on the same branch', () => {
    const s1 = status(1, 'A');
    const s2 = status(2, 'B');
    const s3 = status(3, 'C');

    const twoWay = new StatusTransitionTree([
      transition(1, 2, s1, s2),
      transition(2, 1, s2, s1),
    ]);
    expect(twoWay.getGraph().rootNodes).toHaveLength(0);

    const withBack = new StatusTransitionTree([
      transition(1, 2, s1, s2),
      transition(2, 3, s2, s3),
      transition(3, 2, s3, s2),
    ]);
    const roots = withBack.getHierarchicalTree();
    expect(roots).toHaveLength(1);
    const n3 = roots[0].children[0].children[0];
    expect(n3.id).toBe(3);
    const bAgain = n3.children[0];
    expect(bAgain.id).toBe(2);
    expect(bAgain.hasCircularReference).toBe(true);
  });

  it('stops findAllPaths when revisiting a status in the same walk', () => {
    const s1 = status(1, 'A');
    const s2 = status(2, 'B');
    const tree = new StatusTransitionTree([
      transition(1, 2, s1, s2),
      transition(2, 1, s2, s1),
    ]);
    expect(tree.getGraph().paths).toEqual([]);
  });
});
