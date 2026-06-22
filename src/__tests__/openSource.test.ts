import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { describe, expect, test } from "bun:test";
import { OpenSourceError, openSourceNode } from "../openSource";
import type { ChildProcess } from "node:child_process";
import type { LogicArtifact } from "../shared/schema";

function createArtifact(file: string): LogicArtifact {
  return {
    schemaVersion: 1,
    title: "Open source",
    entry: {
      name: "entry",
      file,
      startLine: 1,
      endLine: 1,
    },
    artifact: {
      id: "open-source",
      createdAt: "2026-06-22T12:00:00+08:00",
    },
    nodes: [
      {
        id: "with-ref",
        kind: "entry",
        label: "with ref",
        summary: "has source",
        codeRef: { file, startLine: 7, endLine: 9 },
      },
      {
        id: "without-ref",
        kind: "statement",
        label: "without ref",
        summary: "no source",
      },
    ],
    edges: [],
    notes: [],
  };
}

function createSpawnStub(calls: Array<{ command: string; args: string[] }>) {
  return (command: string, args: string[]): ChildProcess => {
    calls.push({ command, args });
    const child = new EventEmitter() as ChildProcess;
    child.unref = () => {};
    queueMicrotask(() => child.emit("spawn"));
    return child;
  };
}

describe("openSourceNode", () => {
  test("opens a relative codeRef from the source root", async () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "code-canvas-open-source-"));
    const sourceFile = join(sourceRoot, "src", "cli.ts");
    mkdirSync(join(sourceRoot, "src"));
    writeFileSync(sourceFile, "console.log('ok');");
    const calls: Array<{ command: string; args: string[] }> = [];

    await openSourceNode(createArtifact("src/cli.ts"), "with-ref", sourceRoot, createSpawnStub(calls));

    expect(calls).toEqual([{ command: "code", args: ["-g", `${sourceFile}:7`] }]);
  });

  test("rejects an unknown node", async () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "code-canvas-open-source-"));

    try {
      await openSourceNode(createArtifact("src/cli.ts"), "missing", sourceRoot, createSpawnStub([]));
      throw new Error("Expected openSourceNode to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenSourceError);
      expect((error as OpenSourceError).statusCode).toBe(400);
      expect((error as OpenSourceError).message).toBe("Node not found");
    }
  });

  test("rejects a node without codeRef", async () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "code-canvas-open-source-"));

    try {
      await openSourceNode(createArtifact("src/cli.ts"), "without-ref", sourceRoot, createSpawnStub([]));
      throw new Error("Expected openSourceNode to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenSourceError);
      expect((error as OpenSourceError).statusCode).toBe(400);
      expect((error as OpenSourceError).message).toBe("Node does not have a source reference");
    }
  });

  test("rejects a missing source file", async () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "code-canvas-open-source-"));

    try {
      await openSourceNode(createArtifact("src/missing.ts"), "with-ref", sourceRoot, createSpawnStub([]));
      throw new Error("Expected openSourceNode to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenSourceError);
      expect((error as OpenSourceError).statusCode).toBe(404);
      expect((error as OpenSourceError).message).toBe("Source file not found");
    }
  });
});
