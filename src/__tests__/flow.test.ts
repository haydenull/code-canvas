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
      codeRef: { file: "src/renderState.tsx", startLine: 4, endLine: 6 },
      code: "if (isLoading) {\n  return <Loading />\n}",
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

  test("top-aligns nodes in the same module lane", () => {
    const result = toReactFlowElements(artifact);
    const logicNodes = result.nodes.filter(isLogicNode);

    expect(logicNodes[0].height).not.toBe(logicNodes[1].height);
    expect(logicNodes[0].position.y).toBe(logicNodes[1].position.y);
  });

  test("does not top-align nodes across different modules", () => {
    const result = toReactFlowElements({
      ...artifact,
      nodes: [
        {
          id: "source",
          kind: "entry",
          label: "open page",
          summary: "读取参数并加载页面状态",
          codeRef: { file: "src/page.tsx", startLine: 1, endLine: 12 },
          code: Array.from({ length: 12 }, (_, index) => `const value${index} = ${index}`).join("\n"),
        },
        {
          id: "middle",
          kind: "call",
          label: "call hook",
          summary: "调用 hook 获取状态",
          codeRef: { file: "src/hook.tsx", startLine: 1, endLine: 4 },
          code: "const state = useState()\nreturn state",
        },
        {
          id: "target",
          kind: "statement",
          label: "render footer",
          summary: "根据状态渲染底部提示",
          codeRef: { file: "src/footer.tsx", startLine: 1, endLine: 18 },
          code: Array.from({ length: 18 }, (_, index) => `const footer${index} = ${index}`).join("\n"),
        },
      ],
      edges: [
        { id: "source-middle", source: "source", target: "middle", kind: "next" },
        { id: "middle-target", source: "middle", target: "target", kind: "next" },
      ],
    });
    const moduleGroups = new Map(result.nodes.filter(isModuleGroupNode).map((node) => [node.data.file, node]));

    for (const node of result.nodes.filter(isLogicNode)) {
      const moduleGroup = moduleGroups.get(node.data.codeRef?.file ?? "");

      expect(Number(node.position.y) - Number(moduleGroup?.position.y)).toBeGreaterThanOrEqual(56);
    }
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

  test("reserves space between the module title and its nodes", () => {
    const result = toReactFlowElements(artifact);
    const moduleGroup = result.nodes.find(isModuleGroupNode);
    const moduleNode = result.nodes.find((node) => isLogicNode(node) && node.data.codeRef);

    expect(Number(moduleNode?.position.y) - Number(moduleGroup?.position.y)).toBeGreaterThanOrEqual(56);
  });

  test("reserves space for edge labels between nodes", () => {
    const result = toReactFlowElements({
      ...artifact,
      nodes: [
        {
          id: "source",
          kind: "branch",
          label: "validate port",
          summary: "校验端口",
          codeRef: { file: "src/cli.ts", startLine: 1, endLine: 2 },
        },
        {
          id: "target",
          kind: "statement",
          label: "resolve path",
          summary: "解析路径",
          codeRef: { file: "src/cli.ts", startLine: 3, endLine: 4 },
        },
      ],
      edges: [
        {
          id: "edge",
          source: "source",
          target: "target",
          kind: "true",
          label: "端口合法，触发处理函数",
        },
      ],
    });
    const source = result.nodes.find((node) => node.id === "source");
    const target = result.nodes.find((node) => node.id === "target");
    const gap = Number(target?.position.x) - Number(source?.position.x) - Number(source?.width);

    expect(gap).toBeGreaterThanOrEqual(148);
  });

  test("maps edge code highlights to source and target nodes", () => {
    const result = toReactFlowElements({
      ...artifact,
      nodes: [
        {
          id: "source",
          kind: "call",
          label: "call validate",
          summary: "调用校验",
          code: "function submit() {\n  validateForm();\n}",
        },
        {
          id: "target",
          kind: "statement",
          label: "validateForm",
          summary: "执行校验",
          code: "function validateForm() {\n  return true;\n}",
        },
      ],
      edges: [
        {
          id: "edge",
          source: "source",
          target: "target",
          kind: "call",
          codeHighlights: [
            { node: "source", line: 2, text: "validateForm" },
            { node: "target", line: 1, text: "validateForm" },
          ],
        },
      ],
    });
    const source = result.nodes.find((node) => isLogicNode(node) && node.id === "source");
    const target = result.nodes.find((node) => isLogicNode(node) && node.id === "target");

    expect(source?.data.codeHighlights).toEqual([
      {
        line: 2,
        text: "validateForm",
        edgeId: "edge",
        node: "source",
        handleId: "code-highlight:edge:source",
      },
    ]);
    expect(target?.data.codeHighlights).toEqual([
      {
        line: 1,
        text: "validateForm",
        edgeId: "edge",
        node: "target",
        handleId: "code-highlight:edge:target",
      },
    ]);
    expect(result.edges[0].sourceHandle).toBe("code-highlight:edge:source");
    expect(result.edges[0].targetHandle).toBe("code-highlight:edge:target");
  });

  test("uses default handles for edge ends without code highlights", () => {
    const result = toReactFlowElements({
      ...artifact,
      edges: [{ id: "edge", source: "n1", target: "n2", kind: "next" }],
    });

    expect(result.edges[0].sourceHandle).toBeUndefined();
    expect(result.edges[0].targetHandle).toBeUndefined();
  });

  test("keeps module groups from overlapping", () => {
    const result = toReactFlowElements({
      ...artifact,
      nodes: [
        {
          id: "a1",
          kind: "call",
          label: "call schema",
          summary: "进入 schema",
          codeRef: { file: "src/cli.ts", startLine: 1, endLine: 2 },
        },
        {
          id: "b1",
          kind: "loop",
          label: "validate nodes",
          summary: "校验节点",
          codeRef: { file: "src/schema.ts", startLine: 1, endLine: 2 },
        },
        {
          id: "b2",
          kind: "return",
          label: "return schema",
          summary: "返回校验结果",
          codeRef: { file: "src/schema.ts", startLine: 3, endLine: 4 },
        },
        {
          id: "a2",
          kind: "return",
          label: "continue cli",
          summary: "继续 CLI 流程",
          codeRef: { file: "src/cli.ts", startLine: 3, endLine: 4 },
        },
      ],
      edges: [
        { id: "ab", source: "a1", target: "b1", kind: "call" },
        { id: "bb", source: "b1", target: "b2", kind: "next" },
        { id: "ba", source: "b2", target: "a2", kind: "return" },
      ],
    });
    const [first, second] = result.nodes.filter(isModuleGroupNode);
    const overlaps =
      first.position.x < second.position.x + Number(second.width) &&
      first.position.x + Number(first.width) > second.position.x &&
      first.position.y < second.position.y + Number(second.height) &&
      first.position.y + Number(first.height) > second.position.y;

    expect(overlaps).toBe(false);
  });
});
