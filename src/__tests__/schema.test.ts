import { describe, expect, test } from "bun:test";
import { validateLogicArtifact } from "../shared/schema";

const artifact = {
  schemaVersion: 1,
  title: "Submit flow",
  entry: {
    name: "handleSubmit",
    file: "src/Form.tsx",
    startLine: 10,
    endLine: 42,
  },
  artifact: {
    id: "abcd1234",
    createdAt: "2026-06-18T16:45:00+08:00",
  },
  nodes: [
    {
      id: "n1",
      kind: "entry",
      label: "handleSubmit",
      summary: "入口",
    },
    {
      id: "n2",
      kind: "return",
      label: "return",
      summary: "结束",
    },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2", kind: "next", label: "next" }],
  notes: [],
};

describe("validateLogicArtifact", () => {
  test("accepts a valid artifact", () => {
    expect(validateLogicArtifact(artifact).title).toBe("Submit flow");
  });

  test("accepts edge code highlights", () => {
    const valid = {
      ...artifact,
      nodes: [
        {
          ...artifact.nodes[0],
          code: "function handleSubmit() {\n  validateForm();\n}",
        },
        {
          ...artifact.nodes[1],
          code: "function validateForm() {\n  return true;\n}",
        },
      ],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          kind: "call",
          codeHighlights: [
            { node: "source", line: 2, text: "validateForm" },
            { node: "target", line: 1, text: "validateForm" },
          ],
        },
      ],
    };

    expect(validateLogicArtifact(valid).edges[0]?.codeHighlights).toHaveLength(2);
  });

  test("accepts node code with 60 lines", () => {
    const valid = {
      ...artifact,
      nodes: [
        { ...artifact.nodes[0], code: Array.from({ length: 60 }, (_, index) => `line ${index + 1}`).join("\n") },
        artifact.nodes[1],
      ],
    };

    expect(validateLogicArtifact(valid).nodes[0]?.code?.split("\n")).toHaveLength(60);
  });

  test("rejects missing nodes", () => {
    const invalid = { ...artifact };
    delete (invalid as Partial<typeof artifact>).nodes;

    expect(() => validateLogicArtifact(invalid)).toThrow("nodes must be an array");
  });

  test("rejects edges pointing at missing nodes", () => {
    const invalid = {
      ...artifact,
      edges: [{ id: "e1", source: "n1", target: "missing", kind: "next" }],
    };

    expect(() => validateLogicArtifact(invalid)).toThrow("edges[0].target");
  });

  test("rejects node code with more than 60 lines", () => {
    const invalid = {
      ...artifact,
      nodes: [{ ...artifact.nodes[0], code: Array.from({ length: 61 }, (_, index) => `line ${index + 1}`).join("\n") }],
    };

    expect(() => validateLogicArtifact(invalid)).toThrow("nodes[0].code must be 60 lines or fewer");
  });

  test("rejects code highlights that reference nodes without code", () => {
    const invalid = {
      ...artifact,
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          kind: "call",
          codeHighlights: [{ node: "source", line: 1, text: "handleSubmit" }],
        },
      ],
    };

    expect(() => validateLogicArtifact(invalid)).toThrow("edges[0].codeHighlights[0] must reference a node with code");
  });

  test("rejects code highlights that reference missing lines", () => {
    const invalid = {
      ...artifact,
      nodes: [{ ...artifact.nodes[0], code: "handleSubmit();" }, artifact.nodes[1]],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          kind: "call",
          codeHighlights: [{ node: "source", line: 2, text: "handleSubmit" }],
        },
      ],
    };

    expect(() => validateLogicArtifact(invalid)).toThrow(
      "edges[0].codeHighlights[0].line must reference an existing code line",
    );
  });

  test("rejects code highlights with text that is not on the highlighted line", () => {
    const invalid = {
      ...artifact,
      nodes: [{ ...artifact.nodes[0], code: "handleSubmit();" }, artifact.nodes[1]],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          kind: "call",
          codeHighlights: [{ node: "source", line: 1, text: "validateForm" }],
        },
      ],
    };

    expect(() => validateLogicArtifact(invalid)).toThrow(
      "edges[0].codeHighlights[0].text must appear on the highlighted line",
    );
  });
});
