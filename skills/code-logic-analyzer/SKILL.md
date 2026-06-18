---
name: code-logic-analyzer
description: Analyze TypeScript or React function/component logic into Code Canvas JSON artifacts for React Flow visualization. Use when the user asks Codex to inspect a specific code path, function, component, handler, hook, or source range and produce an artifacts/*.logic.json file for the code-canvas CLI.
---

# Code Logic Analyzer

## Overview

Analyze one focused TypeScript/React logic path and write a Code Canvas artifact. The artifact is the handoff between Codex code understanding and the `code-canvas view <artifactPath>` CLI.

## Workflow

1. Confirm the target file and entry point from the user request. If the entry point is ambiguous after reading the file, ask one concise question.
2. Read only the code needed to understand the requested function, component, hook, handler, and directly relevant helpers.
3. Model the logic as a function flow graph: entry, statements, branches, loops, calls, returns, and throws.
4. Write JSON to `artifacts/<random-id>.logic.json`.
5. Reply with the artifact path and a command like `code-canvas view artifacts/abcd1234.logic.json`.

## Artifact File Naming

- Create `artifacts/` if it does not exist.
- Generate an 8-character random lowercase hex ID, for example from `crypto.randomUUID().replaceAll("-", "").slice(0, 8)`.
- Use `artifacts/<id>.logic.json`.
- Before writing, check that the path does not exist. If it exists, generate a new ID.
- Never overwrite an existing artifact.

## JSON Contract

Use this exact top-level shape:

```json
{
  "schemaVersion": 1,
  "title": "logic name",
  "entry": {
    "name": "functionOrComponentName",
    "file": "src/example.tsx",
    "startLine": 10,
    "endLine": 80
  },
  "artifact": {
    "id": "abcd1234",
    "createdAt": "2026-06-18T16:45:00+08:00"
  },
  "nodes": [],
  "edges": [],
  "notes": []
}
```

Node fields:

- `id`: unique stable ID inside this artifact, such as `n1`.
- `kind`: one of `entry`, `statement`, `branch`, `loop`, `call`, `return`, `throw`.
- `label`: short visible label.
- `summary`: one-sentence explanation.
- `codeRef`: optional `{ "file": string, "startLine": number, "endLine": number }`.
- `code`: optional short snippet.

Edge fields:

- `id`: unique stable ID inside this artifact.
- `source`: source node ID.
- `target`: target node ID.
- `kind`: one of `next`, `true`, `false`, `loop`, `call`, `return`, `error`.
- `label`: optional visible label.

Keep the graph small enough to read. Prefer fewer meaningful nodes over mirroring every line of code.
