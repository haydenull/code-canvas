import dagre from "dagre";
import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import type { LogicArtifact, LogicEdge, LogicNode } from "./schema";

export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  kind: LogicNode["kind"];
  summary: string;
  codeRef?: LogicNode["codeRef"];
  code?: string;
}

export type LogicFlowNode = Node<LogicNodeData>;
export type LogicFlowEdge = Edge<{ kind: LogicEdge["kind"] }>;

const nodeWidth = 240;
const nodeHeight = 96;

export function toReactFlowElements(artifact: LogicArtifact): {
  nodes: LogicFlowNode[];
  edges: LogicFlowEdge[];
} {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 48, ranksep: 96 });

  for (const node of artifact.nodes) {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const edge of artifact.edges) {
    graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);

  return {
    nodes: artifact.nodes.map((node) => {
      const position = graph.node(node.id) ?? { x: 0, y: 0 };
      return {
        id: node.id,
        type: "logic",
        position: {
          x: position.x - nodeWidth / 2,
          y: position.y - nodeHeight / 2,
        },
        data: {
          label: node.label,
          kind: node.kind,
          summary: node.summary,
          codeRef: node.codeRef,
          code: node.code,
        },
      };
    }),
    edges: artifact.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: edge.kind === "call" || edge.kind === "loop",
      data: { kind: edge.kind },
    })),
  };
}
