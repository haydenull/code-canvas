import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { registerViewer, removeViewer, stopViewers } from "../viewerState";

interface ViewerRecord {
  pid: number;
  host: string;
  port: number;
  cwd: string;
  artifactPath: string;
  startedAt: string;
  token: string;
}

function createRecord(overrides: Partial<ViewerRecord> = {}): ViewerRecord {
  return {
    pid: 12345,
    host: "127.0.0.1",
    port: 4173,
    cwd: resolve("/example/project"),
    artifactPath: resolve("/example/project/artifact.logic.json"),
    startedAt: "2026-06-25T12:00:00.000Z",
    token: "token",
    ...overrides,
  };
}

function createStatePath(): string {
  return join(mkdtempSync(join(tmpdir(), "code-canvas-viewers-")), "viewers.json");
}

function readStateFile(statePath: string): ViewerRecord[] {
  return (JSON.parse(readFileSync(statePath, "utf8")) as { viewers: ViewerRecord[] }).viewers;
}

describe("viewer records", () => {
  test("registers and removes a viewer record", () => {
    const statePath = createStatePath();
    const record = createRecord();

    registerViewer(record, statePath);

    expect(readStateFile(statePath)).toEqual([record]);

    removeViewer(record.pid, statePath);

    expect(readStateFile(statePath)).toEqual([]);
  });

  test("replaces an existing record with the same pid", () => {
    const statePath = createStatePath();

    registerViewer(createRecord({ port: 4173 }), statePath);
    registerViewer(createRecord({ port: 4174 }), statePath);

    expect(readStateFile(statePath).map((record) => record.port)).toEqual([4174]);
  });
});

describe("stopViewers", () => {
  test("does not create a state file when no records exist", async () => {
    const statePath = createStatePath();

    const result = await stopViewers(statePath);

    expect(result).toEqual({ stopped: 0, stale: 0, failures: [] });
    expect(existsSync(statePath)).toBe(false);
  });

  test("stops all registered viewer records", async () => {
    const statePath = createStatePath();
    const first = createRecord({ pid: 1, cwd: resolve("/example/project") });
    const second = createRecord({ pid: 2, cwd: resolve("/example/other") });
    const stopped: number[] = [];
    registerViewer(first, statePath);
    registerViewer(second, statePath);

    const result = await stopViewers(statePath, async (record) => {
      stopped.push(record.pid);
      return { stopped: true, stale: false };
    });

    expect(result).toEqual({ stopped: 2, stale: 0, failures: [] });
    expect(stopped).toEqual([1, 2]);
    expect(readStateFile(statePath)).toEqual([]);
  });

  test("cleans stale records", async () => {
    const statePath = createStatePath();
    registerViewer(createRecord({ pid: 1 }), statePath);

    const result = await stopViewers(statePath, async () => ({ stopped: false, stale: true }));

    expect(result).toEqual({ stopped: 0, stale: 1, failures: [] });
    expect(readStateFile(statePath)).toEqual([]);
  });

  test("keeps failed records", async () => {
    const statePath = createStatePath();
    const record = createRecord({ pid: 1 });
    registerViewer(record, statePath);

    const result = await stopViewers(statePath, async () => ({
      stopped: false,
      stale: false,
      error: "Invalid token",
    }));

    expect(result).toEqual({ stopped: 0, stale: 0, failures: ["Invalid token"] });
    expect(readStateFile(statePath)).toEqual([record]);
  });
});
