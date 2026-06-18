#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { Command } from "commander";
import { createServer, type Plugin } from "vite";
import { validateLogicArtifact } from "./shared/schema";

interface ViewOptions {
  host: string;
  port: number;
}

function loadArtifact(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Artifact not found: ${path}`);
  }
  validateLogicArtifact(JSON.parse(readFileSync(path, "utf8")));
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  return port;
}

function artifactPlugin(artifactPath: string): Plugin {
  return {
    name: "code-canvas-artifact",
    configureServer(server) {
      server.middlewares.use("/artifact.json", (_request, response) => {
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(readFileSync(artifactPath, "utf8"));
      });
    },
  };
}

async function view(artifactPath: string, { host, port }: ViewOptions) {
  artifactPath = resolve(artifactPath);
  loadArtifact(artifactPath);

  const viewerRoot = resolve(fileURLToPath(new URL("../src/viewer", import.meta.url)));
  const server = await createServer({
    root: viewerRoot,
    configFile: false,
    server: { host, port, strictPort: port !== 0 },
    plugins: [react(), artifactPlugin(artifactPath)],
  });

  await server.listen();
  server.printUrls();
  console.log(`Serving artifact: ${artifactPath}`);
}

const program = new Command();

program
  .name("code-canvas")
  .command("view <artifactPath>")
  .option("--host <host>", "host", "127.0.0.1")
  .option("--port <port>", "port", parsePort, 0)
  .action(view);

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
