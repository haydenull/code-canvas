import { describe, expect, test } from "bun:test";
import { toReactFlowElements } from "../shared/flow";
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

describe("toReactFlowElements", () => {
  test("maps artifact nodes and edges to React Flow elements", () => {
    const result = toReactFlowElements(artifact);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].data.label).toBe("renderState");
    expect(result.nodes[0].data.codeRef?.file).toBe("src/renderState.tsx");
    expect(result.edges[0].source).toBe("n1");
    expect(result.edges[0].target).toBe("n2");
    expect(result.nodes[0].position.x).toBeNumber();
  });
});
