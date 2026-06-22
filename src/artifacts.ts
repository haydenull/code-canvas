import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export function createArtifactId(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}

export function createArtifactsDir(cwd = process.cwd()): string {
  const projectHash = createHash("sha256").update(resolve(cwd)).digest("hex").slice(0, 8);
  return join(tmpdir(), "code-canvas", projectHash);
}

export function createArtifactPath(artifactsDir = createArtifactsDir()): { id: string; path: string } {
  mkdirSync(artifactsDir, { recursive: true });

  for (;;) {
    const id = createArtifactId();
    const path = resolve(artifactsDir, `${id}.logic.json`);
    if (!existsSync(path)) {
      return { id, path };
    }
  }
}
