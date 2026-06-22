import { z } from "zod";

export const nodeKinds = ["entry", "statement", "branch", "loop", "call", "return", "throw"] as const;
export const edgeKinds = ["next", "true", "false", "loop", "call", "return", "error"] as const;
const maxCodeLineCount = 60;

const codeRefSchema = z.object(
  {
    file: z.string().min(1),
    startLine: z.number(),
    endLine: z.number(),
  },
  { error: "must be an object" },
);

const entrySchema = z.object(
  {
    name: z.string().min(1),
    file: z.string().min(1),
    startLine: z.number(),
    endLine: z.number(),
  },
  { error: "must be an object" },
);

const artifactMetaSchema = z.object(
  {
    id: z.string().min(1),
    createdAt: z.string().min(1),
  },
  { error: "must be an object" },
);

const nodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(nodeKinds, { error: "is invalid" }),
  label: z.string().min(1),
  summary: z.string().min(1),
  codeRef: codeRefSchema.optional(),
  code: z.string({ error: "must be a string" }).optional(),
});

const codeHighlightSchema = z.object({
  node: z.enum(["source", "target"], { error: "is invalid" }),
  line: z.number().int().positive(),
  text: z.string().min(1),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(edgeKinds, { error: "is invalid" }),
  label: z.string({ error: "must be a string" }).optional(),
  codeHighlights: z.array(codeHighlightSchema, { error: "must be an array" }).optional(),
});

const logicArtifactSchema = z
  .object(
    {
      schemaVersion: z.literal(1, { error: "must be 1" }),
      title: z.string().min(1),
      entry: entrySchema,
      artifact: artifactMetaSchema,
      nodes: z.array(nodeSchema, { error: "must be an array" }),
      edges: z.array(edgeSchema, { error: "must be an array" }),
      notes: z.array(z.string({ error: "must be a string" }), { error: "must be an array of strings" }),
    },
    { error: "Artifact must be a JSON object" },
  )
  .superRefine((artifact, ctx) => {
    const nodeIds = new Set<string>();
    const nodeById = new Map<string, (typeof artifact.nodes)[number]>();

    for (const [index, node] of artifact.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: `nodes[${index}].id must be unique`,
        });
      }
      nodeIds.add(node.id);
      nodeById.set(node.id, node);
      if (node.code && node.code.split("\n").length > maxCodeLineCount) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "code"],
          message: `nodes[${index}].code must be ${maxCodeLineCount} lines or fewer`,
        });
      }
    }

    for (const [index, edge] of artifact.edges.entries()) {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "source"],
          message: `edges[${index}].source must reference an existing node`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "target"],
          message: `edges[${index}].target must reference an existing node`,
        });
      }
      for (const [highlightIndex, highlight] of edge.codeHighlights?.entries() ?? []) {
        const nodeId = highlight.node === "source" ? edge.source : edge.target;
        const node = nodeById.get(nodeId);
        const path = ["edges", index, "codeHighlights", highlightIndex];

        if (!node) {
          continue;
        }
        if (!node.code) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `edges[${index}].codeHighlights[${highlightIndex}] must reference a node with code`,
          });
          continue;
        }

        const line = node.code.split("\n")[highlight.line - 1];
        if (line === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "line"],
            message: `edges[${index}].codeHighlights[${highlightIndex}].line must reference an existing code line`,
          });
          continue;
        }
        if (!line.includes(highlight.text)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "text"],
            message: `edges[${index}].codeHighlights[${highlightIndex}].text must appear on the highlighted line`,
          });
        }
      }
    }
  });

export type LogicNodeKind = (typeof nodeKinds)[number];
export type LogicEdgeKind = (typeof edgeKinds)[number];
export type CodeRef = z.infer<typeof codeRefSchema>;
export type LogicNode = z.infer<typeof nodeSchema>;
export type LogicEdge = z.infer<typeof edgeSchema>;
export type LogicArtifact = z.infer<typeof logicArtifactSchema>;

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((formatted, part) => {
    if (typeof part === "number") {
      return `${formatted}[${part}]`;
    }
    const key = String(part);
    return formatted ? `${formatted}.${key}` : key;
  }, "");
}

export function validateLogicArtifact(value: unknown): LogicArtifact {
  const result = logicArtifactSchema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];
    if (!issue) {
      throw new Error("Artifact is invalid");
    }
    const path = formatPath(issue.path);
    throw new Error(path ? `${path} ${issue.message}` : issue.message);
  }

  return result.data;
}
