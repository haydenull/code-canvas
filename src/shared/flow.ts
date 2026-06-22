import dagre from "dagre";
import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import type { LogicArtifact, LogicEdge, LogicNode } from "./schema";

export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  kind: LogicNode["kind"];
  summary: string;
  codeRef?: {
    file: string;
    startLine: number;
    endLine: number;
  };
  code?: string;
  codeHighlights?: LogicCodeHighlight[];
  moduleTheme?: ModuleTheme;
}

export interface ModuleGroupNodeData extends Record<string, unknown> {
  file: string;
  nodeCount: number;
  moduleTheme: ModuleTheme;
}

export type LogicFlowNode = Node<LogicNodeData> & { type: "logic"; data: LogicNodeData };
export type ModuleGroupFlowNode = Node<ModuleGroupNodeData> & { type: "moduleGroup"; data: ModuleGroupNodeData };
export type LogicFlowElementNode = LogicFlowNode | ModuleGroupFlowNode;
export type LogicFlowEdge = Edge<{ kind: LogicEdge["kind"] }>;

export interface LogicCodeHighlight {
  line: number;
  text: string;
  edgeId?: string;
  node?: "source" | "target";
  handleId?: string;
}

const nodeWidth = 320;
const nodeHeight = 96;
const maxVisibleCodeLines = 60;
const codeLineHeight = 14.5;
const codeVerticalPadding = 20;

interface ModuleTheme {
  accent: string;
  border: string;
  background: string;
}

const moduleThemes: ModuleTheme[] = [
  { accent: "#c8aa00", border: "#c8aa00", background: "#fff9db" },
  { accent: "#4aa06b", border: "#4aa06b", background: "#eef8f1" },
  { accent: "#5172d9", border: "#5172d9", background: "#eef3ff" },
  { accent: "#ce5b7a", border: "#ce5b7a", background: "#fff0f4" },
  { accent: "#40a9a6", border: "#40a9a6", background: "#ecfbfa" },
  { accent: "#8b63cf", border: "#8b63cf", background: "#f4efff" },
];

function estimateTextHeight(text: string, charactersPerLine: number, lineHeight: number): number {
  return Math.ceil(text.length / charactersPerLine) * lineHeight;
}

function estimateCodeHeight(code?: string): number {
  if (!code) {
    return 0;
  }
  const lineCount = code.split("\n").length;
  return Math.min(maxVisibleCodeLines, lineCount) * codeLineHeight + codeVerticalPadding;
}

function estimateEdgeLabelWidth(label?: string): number {
  return label ? label.length * 12 + 16 : 0;
}

function estimateNodeHeight(node: LogicNode): number {
  const labelHeight = estimateTextHeight(node.label, 24, 18);
  const summaryHeight = estimateTextHeight(node.summary, 34, 16.2);
  const detailHeight = node.codeRef || node.code ? 25 + (node.codeRef ? 22 : 0) + estimateCodeHeight(node.code) : 0;
  return Math.ceil(72 + 13 + 6 + labelHeight + 8 + summaryHeight + detailHeight);
}

function getModuleGroupId(file: string): string {
  return `module:${encodeURIComponent(file)}`;
}

function getCodeHighlightHandleId(edgeId: string, node: "source" | "target"): string {
  return `code-highlight:${edgeId}:${node}`;
}

function createModuleThemeMap(files: string[], entryFile: string): Map<string, ModuleTheme> {
  const sortedFiles = [...files].sort((left, right) => {
    if (left === entryFile) {
      return -1;
    }
    if (right === entryFile) {
      return 1;
    }
    return left.localeCompare(right);
  });

  return new Map(
    sortedFiles.map((file, index) => [file, moduleThemes[index % moduleThemes.length]]),
  );
}

function createModuleGroupNodes(
  graph: dagre.graphlib.Graph,
  nodes: LogicNode[],
  moduleThemeByFile: Map<string, ModuleTheme>,
): ModuleGroupFlowNode[] {
  return Array.from(moduleThemeByFile, ([file, moduleTheme]) => {
    const position = graph.node(getModuleGroupId(file));
    const width = position?.width ?? nodeWidth;
    const height = position?.height ?? nodeHeight;

    return {
      id: getModuleGroupId(file),
      type: "moduleGroup",
      position: {
        x: (position?.x ?? 0) - width / 2,
        y: (position?.y ?? 0) - height / 2,
      },
      width,
      height,
      zIndex: 0,
      style: { width, height },
      selectable: false,
      draggable: false,
      data: {
        file,
        nodeCount: nodes.filter((node) => node.codeRef?.file === file).length,
        moduleTheme,
      },
    };
  });
}

export function toReactFlowElements(artifact: LogicArtifact): {
  nodes: LogicFlowElementNode[];
  edges: LogicFlowEdge[];
} {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 96, ranksep: 96 });
  const nodeHeights = new Map(artifact.nodes.map((node) => [node.id, estimateNodeHeight(node)]));
  const codeHighlightsByNodeId = new Map<string, LogicCodeHighlight[]>();
  const moduleThemeByFile = createModuleThemeMap(
    Array.from(new Set(artifact.nodes.map((node) => node.codeRef?.file).filter((file) => file !== undefined))),
    artifact.entry.file,
  );

  for (const file of moduleThemeByFile.keys()) {
    graph.setNode(getModuleGroupId(file), {});
  }
  for (const node of artifact.nodes) {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeights.get(node.id) ?? nodeHeight });
    if (node.codeRef) {
      graph.setParent(node.id, getModuleGroupId(node.codeRef.file));
    }
  }
  for (const edge of artifact.edges) {
    graph.setEdge(edge.source, edge.target, edge.label ? {
      width: estimateEdgeLabelWidth(edge.label),
      height: 24,
      labelpos: "c",
    } : {});
    const anchoredNodes = new Set<"source" | "target">();
    for (const highlight of edge.codeHighlights ?? []) {
      const nodeId = highlight.node === "source" ? edge.source : edge.target;
      const highlights = codeHighlightsByNodeId.get(nodeId) ?? [];
      const isAnchor = !anchoredNodes.has(highlight.node);
      highlights.push({
        line: highlight.line,
        text: highlight.text,
        edgeId: edge.id,
        node: highlight.node,
        handleId: isAnchor ? getCodeHighlightHandleId(edge.id, highlight.node) : undefined,
      });
      anchoredNodes.add(highlight.node);
      codeHighlightsByNodeId.set(nodeId, highlights);
    }
  }
  dagre.layout(graph);

  const laneTopByCenter = new Map<number, number>();
  for (const node of artifact.nodes) {
    const position = graph.node(node.id) ?? { x: 0, y: 0 };
    const height = nodeHeights.get(node.id) ?? nodeHeight;
    laneTopByCenter.set(
      position.y,
      Math.min(laneTopByCenter.get(position.y) ?? Number.POSITIVE_INFINITY, position.y - height / 2),
    );
  }

  const nodes: LogicFlowNode[] = artifact.nodes.map((node) => {
    const position = graph.node(node.id) ?? { x: 0, y: 0 };
    const height = nodeHeights.get(node.id) ?? nodeHeight;
    return {
      id: node.id,
      type: "logic",
      width: nodeWidth,
      height,
      zIndex: 1,
      position: {
        x: position.x - nodeWidth / 2,
        y: laneTopByCenter.get(position.y) ?? position.y - height / 2,
      },
      data: {
        label: node.label,
        kind: node.kind,
        summary: node.summary,
        codeRef: node.codeRef,
        code: node.code,
        codeHighlights: codeHighlightsByNodeId.get(node.id),
        moduleTheme: node.codeRef ? moduleThemeByFile.get(node.codeRef.file) : undefined,
      },
    };
  });

  return {
    nodes: [...createModuleGroupNodes(graph, artifact.nodes, moduleThemeByFile), ...nodes],
    edges: artifact.edges.map((edge) => {
      const sourceHandle = edge.codeHighlights?.some((highlight) => highlight.node === "source")
        ? getCodeHighlightHandleId(edge.id, "source")
        : undefined;
      const targetHandle = edge.codeHighlights?.some((highlight) => highlight.node === "target")
        ? getCodeHighlightHandleId(edge.id, "target")
        : undefined;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle,
        targetHandle,
        label: edge.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: edge.kind === "call" || edge.kind === "loop",
        zIndex: 1,
        data: { kind: edge.kind },
      };
    }),
  };
}
