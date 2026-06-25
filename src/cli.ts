#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { createArtifactPath } from "./artifacts";
import { OpenSourceError, openSourceNode } from "./openSource";
import { validateLogicArtifact, type LogicArtifact } from "./shared/schema";
import { createViewerToken, registerViewer, removeViewer, stopViewers } from "./viewerState";

process.title = "code-canvas";

interface ViewOptions {
  host: string;
  port: number;
}

interface PackageJson {
  version: string;
}

const viewerContentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function loadVersion(): string {
  const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson;
  return packageJson.version;
}

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
  loadArtifact(artifactPath);
  const sourceRoot = resolve(process.cwd());
  const token = createViewerToken();
  let stopping = false;
  let listeningPort = port;

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

            await openSourceNode(loadArtifact(artifactPath), payload.nodeId, sourceRoot);
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

    if (pathname === "/__code-canvas/stop") {
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
        let payload: { token?: unknown };
        try {
          payload = JSON.parse(body) as { token?: unknown };
        } catch {
          response.statusCode = 400;
          response.end("Invalid JSON");
          return;
        }

        if (payload.token !== token) {
          response.statusCode = 403;
          response.end("Invalid token");
          return;
        }

        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ ok: true }));
        queueMicrotask(stop);
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

  const stop = (): void => {
    if (stopping) {
      return;
    }

    stopping = true;
    console.log("\nStopping viewer...");
    server.close(() => {
      removeViewer(process.pid);
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    });
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  const address = server.address();
  listeningPort = typeof address === "object" && address ? address.port : port;
  registerViewer({
    pid: process.pid,
    host,
    port: listeningPort,
    cwd: sourceRoot,
    artifactPath,
    startedAt: new Date().toISOString(),
    token,
  });
  console.log(`Local: http://${host}:${listeningPort}/`);
  console.log(`Serving artifact: ${artifactPath}`);
}

async function stopViewerCommand(): Promise<void> {
  const result = await stopViewers();

  for (const failure of result.failures) {
    console.error(failure);
  }

  if (result.failures.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (result.stopped === 0 && result.stale === 0) {
    console.log("No viewer processes found.");
    return;
  }

  console.log(`Stopped ${result.stopped} viewer process${result.stopped === 1 ? "" : "es"}.`);
}

const program = new Command();

program
  .name("code-canvas")
  .description("validate and visualize Code Canvas .logic.json artifacts")
  .version(loadVersion(), "-v, --version", "display version number");

program
  .command("validate <artifactPath>")
  .description("validate a .logic.json artifact")
  .action(validate);

program
  .command("artifact")
  .description("manage logic artifact files")
  .command("path")
  .description("print a new temporary .logic.json path")
  .action(printArtifactPath);

program
  .command("view <artifactPath>")
  .description("serve a .logic.json artifact in the local viewer")
  .option("--host <host>", "host", "127.0.0.1")
  .option("--port <port>", "port", parsePort, 0)
  .action(view);

program
  .command("stop")
  .description("stop all viewer processes")
  .action(stopViewerCommand);

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
