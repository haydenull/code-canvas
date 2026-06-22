#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { createArtifactPath } from "./artifacts";
import { OpenSourceError, openSourceNode } from "./openSource";
import { validateLogicArtifact, type LogicArtifact } from "./shared/schema";

interface ViewOptions {
  host: string;
  port: number;
}

const viewerContentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function loadArtifact(path: string): LogicArtifact {
  if (!existsSync(path)) {
    throw new Error(`Artifact not found: ${path}`);
  }
  return validateLogicArtifact(JSON.parse(readFileSync(path, "utf8")));
}

function validate(artifactPath: string): void {
  artifactPath = resolve(artifactPath);
  loadArtifact(artifactPath);
  console.log(`Artifact is valid: ${artifactPath}`);
}

function printArtifactPath(): void {
  console.log(createArtifactPath().path);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  return port;
}

async function view(artifactPath: string, { host, port }: ViewOptions): Promise<void> {
  artifactPath = resolve(artifactPath);
  const artifact = loadArtifact(artifactPath);
  const sourceRoot = process.cwd();

  const viewerRoot = resolve(fileURLToPath(new URL("./viewer", import.meta.url)));
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (pathname === "/artifact.json") {
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(readFileSync(artifactPath, "utf8"));
      return;
    }

    if (pathname === "/open-source") {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }

      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        void (async () => {
          try {
            const payload = JSON.parse(body) as { nodeId?: unknown };
            if (typeof payload.nodeId !== "string") {
              response.statusCode = 400;
              response.end("nodeId must be a string");
              return;
            }

            await openSourceNode(artifact, payload.nodeId, sourceRoot);
            response.setHeader("content-type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = error instanceof OpenSourceError ? error.statusCode : 400;
            response.end(error instanceof Error ? error.message : "Unable to open source");
          }
        })();
      });
      return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = resolve(viewerRoot, relativePath);
    const isViewerFile = pathname === "/" || pathname === "/index.html" || pathname.startsWith("/assets/");

    if (!isViewerFile || !filePath.startsWith(`${viewerRoot}${sep}`) || !existsSync(filePath)) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    response.setHeader("content-type", viewerContentTypes[extname(filePath)] ?? "application/octet-stream");
    response.end(readFileSync(filePath));
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  const listeningPort = typeof address === "object" && address ? address.port : port;
  console.log(`Local: http://${host}:${listeningPort}/`);
  console.log(`Serving artifact: ${artifactPath}`);
}

const program = new Command();

program.name("code-canvas");

program
  .command("validate <artifactPath>")
  .action(validate);

program
  .command("artifact")
  .description("manage logic artifact files")
  .command("path")
  .description("print a new temporary .logic.json path")
  .action(printArtifactPath);

program
  .command("view <artifactPath>")
  .option("--host <host>", "host", "127.0.0.1")
  .option("--port <port>", "port", parsePort, 0)
  .action(view);

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
