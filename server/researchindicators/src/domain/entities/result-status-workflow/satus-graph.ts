import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultStatusWorkflow } from './entities/result-status-workflow.entity';

interface StatusNode {
  status: ResultStatus;
  statusId: number;
  name: string;
  description: string;
  config: any;
  action_description: string;
  editable_roles: number[];
  hasCircularReference: boolean;
  transitions: {
    to: StatusNode[];
    from: StatusNode[];
  };
  // Para rastrear las rutas posibles
  possibleNextStates: number[];
  possiblePreviousStates: number[];
}

interface StatusGraph {
  nodes: Map<number, StatusNode>;
  rootNodes: StatusNode[];
  leafNodes: StatusNode[];
  paths: string[][];
}

export class StatusTransitionTree {
  private transitions: ResultStatusWorkflow[];
  private graph: StatusGraph;

  constructor(transitions: ResultStatusWorkflow[]) {
    this.transitions = transitions;
    this.graph = {
      nodes: new Map(),
      rootNodes: [],
      leafNodes: [],
      paths: [],
    };
    this.buildGraph();
  }

  private buildGraph(): void {
    const uniqueStatuses = new Map<number, ResultStatus>();

    this.transitions.forEach((transition) => {
      uniqueStatuses.set(transition.from_status_id, transition.from_status);
      uniqueStatuses.set(transition.to_status_id, transition.to_status);
    });

    uniqueStatuses.forEach((status, statusId) => {
      const node: StatusNode = {
        editable_roles: status.editable_roles,
        status: status,
        statusId: statusId,
        name: status.name,
        description: status.description,
        config: status.config,
        action_description: status.action_description,
        hasCircularReference: false,
        transitions: {
          to: [],
          from: [],
        },
        possibleNextStates: [],
        possiblePreviousStates: [],
      };
      this.graph.nodes.set(statusId, node);
    });

    this.transitions.forEach((transition) => {
      const fromNode = this.graph.nodes.get(transition.from_status_id);
      const toNode = this.graph.nodes.get(transition.to_status_id);

      if (fromNode && toNode) {
        if (!fromNode.transitions.to.includes(toNode)) {
          fromNode.transitions.to.push(toNode);
          fromNode.possibleNextStates.push(transition.to_status_id);
        }

        if (!toNode.transitions.from.includes(fromNode)) {
          toNode.transitions.from.push(fromNode);
          toNode.possiblePreviousStates.push(transition.from_status_id);
        }
      }
    });

    this.graph.nodes.forEach((node) => {
      if (node.possiblePreviousStates.length === 0) {
        this.graph.rootNodes.push(node);
      }
      if (node.possibleNextStates.length === 0) {
        this.graph.leafNodes.push(node);
      }
    });

    this.graph.rootNodes.forEach((rootNode) => {
      this.findAllPaths(rootNode, [], new Set());
    });
  }

  private findAllPaths(
    node: StatusNode,
    currentPath: string[],
    visited: Set<number>,
  ): void {
    if (visited.has(node.statusId)) {
      return;
    }

    const newPath = [...currentPath, node.name];
    visited.add(node.statusId);

    if (node.possibleNextStates.length === 0) {
      this.graph.paths.push(newPath);
    } else {
      node.transitions.to.forEach((nextNode) => {
        this.findAllPaths(nextNode, newPath, new Set(visited));
      });
    }
  }

  getGraph(): StatusGraph {
    return this.graph;
  }

  getHierarchicalTree(): any {
    const tree: any[] = [];

    this.graph.rootNodes.forEach((rootNode) => {
      tree.push(this.buildTreeNode(rootNode, new Set()));
    });

    return tree;
  }

  private buildTreeNode(node: StatusNode, visited: Set<number>): any {
    if (visited.has(node.statusId)) {
      return {
        id: node.statusId,
        name: node.name,
        description: node.description,
        hasCircularReference: true,
        action_description: node.action_description,
        config: node.config,
        editable_roles: node.editable_roles,
        children: [],
      };
    }

    visited.add(node.statusId);

    const treeNode: any = {
      id: node.statusId,
      name: node.name,
      description: node.description,
      config: node.config,
      canTransitionTo: node.possibleNextStates,
      children: [],
    };

    node.transitions.to.forEach((childNode) => {
      treeNode.children.push(this.buildTreeNode(childNode, new Set(visited)));
    });

    return treeNode;
  }

  getPossibleTransitionsFrom(statusId: number): StatusNode[] {
    const node = this.graph.nodes.get(statusId);
    return node ? node.transitions.to : [];
  }

  getPossibleTransitionsTo(statusId: number): StatusNode[] {
    const node = this.graph.nodes.get(statusId);
    return node ? node.transitions.from : [];
  }

  hasPath(fromStatusId: number, toStatusId: number): boolean {
    const visited = new Set<number>();
    return this.searchPath(fromStatusId, toStatusId, visited);
  }

  private searchPath(
    currentId: number,
    targetId: number,
    visited: Set<number>,
  ): boolean {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    const node = this.graph.nodes.get(currentId);

    if (!node) return false;

    for (const nextNode of node.transitions.to) {
      if (this.searchPath(nextNode.statusId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }

  getStatistics() {
    return {
      totalStates: this.graph.nodes.size,
      totalTransitions: this.transitions.length,
      rootNodes: this.graph.rootNodes.map((n) => n.name),
      leafNodes: this.graph.leafNodes.map((n) => n.name),
      possiblePaths: this.graph.paths.length,
      paths: this.graph.paths,
    };
  }

  toMermaidDiagram(): string {
    let diagram = 'graph TD\n';

    this.graph.nodes.forEach((node) => {
      diagram += `    ${node.statusId}["${node.name}"]\n`;
    });

    diagram += '\n';

    this.transitions.forEach((transition) => {
      diagram += `    ${transition.from_status_id} --> ${transition.to_status_id}\n`;
    });

    return diagram;
  }
}
