import { describe, expect, test } from "bun:test";
import { toReactFlowElements } from "../shared/flow";
import type { LogicFlowNode, ModuleGroupFlowNode } from "../shared/flow";
import type { LogicArtifact } from "../shared/schema";

const artifact: LogicArtifact = {
  schemaVersion: 1,
  title: "Branch flow",
  entry: {
    name: "renderState",
    file: "src/renderState.tsx",
    startLine: 1,
    endLine: 20,
  },
  artifact: {
    id: "flow1234",
    createdAt: "2026-06-18T16:45:00+08:00",
  },
  nodes: [
    {
      id: "n1",
      kind: "entry",
      label: "renderState",
      summary: "入口",
      codeRef: { file: "src/renderState.tsx", startLine: 1, endLine: 3 },
    },
    {
      id: "n2",
      kind: "branch",
      label: "isLoading?",
      summary: "判断加载状态",
    },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2", kind: "next", label: "next" }],
  notes: [],
};

function isModuleGroupNode(node: unknown): node is ModuleGroupFlowNode {
  return typeof node === "object" && node !== null && "type" in node && node.type === "moduleGroup";
}

function isLogicNode(node: unknown): node is LogicFlowNode {
  return typeof node === "object" && node !== null && "type" in node && node.type === "logic";
}

describe("toReactFlowElements", () => {
  test("maps artifact nodes and edges to React Flow elements", () => {
    const result = toReactFlowElements(artifact);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(1);
    const logicNode = result.nodes.find((node) => isLogicNode(node) && node.id === "n1");
    const moduleGroup = result.nodes.find(isModuleGroupNode);
    expect(logicNode?.data.label).toBe("renderState");
    expect((logicNode?.data.codeRef as { file: string } | undefined)?.file).toBe("src/renderState.tsx");
    expect(moduleGroup?.data.file).toBe("src/renderState.tsx");
    expect(moduleGroup?.data.moduleTheme.accent).toBe("#c8aa00");
    expect(result.edges[0].source).toBe("n1");
    expect(result.edges[0].target).toBe("n2");
    expect(logicNode?.position.x).toBeNumber();
  });

  test("top-aligns nodes in the same horizontal lane", () => {
    const result = toReactFlowElements(artifact);
    const logicNodes = result.nodes.filter(isLogicNode);

    expect(logicNodes[0].height).not.toBe(logicNodes[1].height);
    expect(logicNodes[0].position.y).toBe(logicNodes[1].position.y);
  });

  test("assigns different colors to different module groups", () => {
    const result = toReactFlowElements({
      ...artifact,
      nodes: [
        ...artifact.nodes,
        {
          id: "n3",
          kind: "call",
          label: "renderLoaded",
          summary: "渲染完成态",
          codeRef: { file: "src/renderLoaded.tsx", startLine: 1, endLine: 3 },
        },
      ],
    });
    const moduleGroups = result.nodes.filter(isModuleGroupNode);
    const accents = new Set(moduleGroups.map((node) => node.data.moduleTheme.accent));

    expect(moduleGroups).toHaveLength(2);
    expect(accents.size).toBe(2);
  });
});
