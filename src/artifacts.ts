import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export function createArtifactId(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}

export function createArtifactPath(artifactsDir = "artifacts"): { id: string; path: string } {
  mkdirSync(artifactsDir, { recursive: true });

  for (;;) {
    const id = createArtifactId();
    const path = join(artifactsDir, `${id}.logic.json`);
    if (!existsSync(path)) {
      return { id, path };
    }
  }
}
