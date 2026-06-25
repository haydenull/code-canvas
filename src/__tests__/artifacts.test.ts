import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createArtifactPath, createArtifactsDir } from "../artifacts";

describe("createArtifactPath", () => {
  test("uses .code-canvas directory under home dir scoped by project path", () => {
    const dir = createArtifactsDir("/example/project");

    expect(dir.startsWith(join(homedir(), ".code-canvas"))).toBe(true);
    expect(dir).toMatch(/project-[a-f0-9]{8}$/);
  });

  test("returns a random logic artifact path", () => {
    const dir = join(import.meta.dir, "../../.tmp/artifacts-a");
    const result = createArtifactPath(dir);

    expect(result.id).toMatch(/^[a-f0-9]{8}$/);
    expect(result.path.endsWith(".logic.json")).toBe(true);
  });

  test("does not overwrite an existing artifact path", () => {
    const dir = join(import.meta.dir, "../../.tmp/artifacts-b");
    mkdirSync(dir, { recursive: true });

    const first = createArtifactPath(dir);
    writeFileSync(first.path, "{}");
    const second = createArtifactPath(dir);

    expect(second.path).not.toBe(first.path);
  });
});
