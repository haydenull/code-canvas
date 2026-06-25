import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export function createArtifactId(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}

export function createArtifactsDir(cwd = process.cwd()): string {
  const absPath = resolve(cwd);
  const projectHash = createHash("sha256").update(absPath).digest("hex").slice(0, 8);
  const projectName = basename(absPath);
  return join(homedir(), ".code-canvas", `${projectName}-${projectHash}`);
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
