import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import type { ChildProcess } from "node:child_process";
import type { LogicArtifact } from "./shared/schema";

type SpawnCode = (command: string, args: string[]) => ChildProcess;

export class OpenSourceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export function resolveCodeRefFile(file: string, sourceRoot: string): string {
  return isAbsolute(file) ? file : resolve(sourceRoot, file);
}

export async function openSourceNode(
  artifact: LogicArtifact,
  nodeId: string,
  sourceRoot: string,
  spawnCode: SpawnCode = (command, args) => spawn(command, args, { stdio: "ignore" }),
): Promise<void> {
  const node = artifact.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new OpenSourceError("Node not found", 400);
  }
  if (!node.codeRef) {
    throw new OpenSourceError("Node does not have a source reference", 400);
  }

  const filePath = resolveCodeRefFile(node.codeRef.file, sourceRoot);
  if (!existsSync(filePath)) {
    throw new OpenSourceError("Source file not found", 404);
  }

  const child = spawnCode("code", ["-g", `${filePath}:${node.codeRef.startLine}`]);
  await new Promise<void>((resolveSpawn, rejectSpawn) => {
    child.once("spawn", () => {
      child.unref();
      resolveSpawn();
    });
    child.once("error", () => rejectSpawn(new OpenSourceError("Unable to open VS Code", 500)));
  });
}
