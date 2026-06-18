import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createArtifactPath } from "../artifacts";

describe("createArtifactPath", () => {
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
