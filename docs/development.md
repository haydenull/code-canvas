# Code Canvas

[简体中文](development.zh-CN.md)

Code Canvas converts code control flow and call relationships into interactive flowcharts, helping developers quickly understand functions, components, hooks, event handlers, and cross-file call chains.

The project includes:

- `@haydenull/code-canvas`: Validates `.logic.json` artifacts via CLI and displays nodes, branches, call relationships, module groups, and source code snippets in a Web Viewer.
- `code-canvas-generator` Skill: Reads real source code and generates flowchart artifacts that conform to the spec.

## Requirements

- Using the CLI: [Node.js](https://nodejs.org/) 20 or later.
- Local development: [Bun](https://bun.sh/).

## Quick Start

Install dependencies:

```bash
bun install
```

Open the example flowchart in the repo:

```bash
bun run view
```

The command starts a local server and prints the access URL. Defaults to `127.0.0.1` with a port assigned by the system.

## CLI Usage

Run the published CLI without installing via `npx`:

```bash
npx @haydenull/code-canvas validate artifacts/example.logic.json
npx @haydenull/code-canvas view artifacts/example.logic.json
npx @haydenull/code-canvas artifact path
```

In development, run the source directly to validate artifacts:

```bash
bun src/cli.ts validate artifacts/example.logic.json
```

The `view` command requires static assets to be built first. It supports specifying a host and port:

```bash
bun run build
node dist/cli.js view artifacts/example.logic.json --host 0.0.0.0 --port 4173
```

After building, you can also run via the dist output:

```bash
bun run build
node dist/cli.js validate artifacts/example.logic.json
node dist/cli.js view artifacts/example.logic.json
```

## Generating Flowchart Artifacts

The built-in [`code-canvas-generator`](../skills/code-canvas-generator/SKILL.md) Skill reads the specified entry point and its required call chain, calls the CLI to get the `.logic.json` output path in the system temp directory, and writes the generated flowchart artifact to that path.

## Development Commands

```bash
bun run test   # Run tests
bun run check  # TypeScript type check
bun run build  # Build CLI with type check
```

See [Publishing Docs](publishing.md) for publishing to npm.

## Project Structure

```text
src/
├── cli.ts              # CLI entry point and local Viewer server
├── shared/
│   ├── flow.ts         # Artifact to React Flow data conversion and layout
│   └── schema.ts       # Artifact data structure and validation
└── viewer/             # React visualization UI
skills/
└── code-canvas-generator # Code Canvas artifact generation Skill
artifacts/              # Generated flowchart artifacts and examples
```
