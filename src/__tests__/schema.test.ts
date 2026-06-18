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
});
