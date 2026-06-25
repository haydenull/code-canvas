import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

interface ViewerRecord {
  pid: number;
  host: string;
  port: number;
  cwd: string;
  artifactPath: string;
  startedAt: string;
  token: string;
}

interface ViewersState {
  viewers: ViewerRecord[];
}

interface StopViewerResult {
  stopped: number;
  stale: number;
  failures: string[];
}

type StopRequest = (record: ViewerRecord) => Promise<StopRequestResult>;

interface StopRequestResult {
  stopped: boolean;
  stale: boolean;
  error?: string;
}

function getViewersStatePath(): string {
  return join(homedir(), ".code-canvas", "viewers.json");
}

export function createViewerToken(): string {
  return randomUUID();
}

function readViewerRecords(statePath = getViewersStatePath()): ViewerRecord[] {
  if (!existsSync(statePath)) {
    return [];
  }

  const state = JSON.parse(readFileSync(statePath, "utf8")) as ViewersState;
  return state.viewers;
}

function writeViewerRecords(records: ViewerRecord[], statePath = getViewersStatePath()): void {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify({ viewers: records }, null, 2)}\n`);
}

export function registerViewer(record: ViewerRecord, statePath = getViewersStatePath()): void {
  const records = readViewerRecords(statePath).filter((viewer) => viewer.pid !== record.pid);
  records.push(record);
  writeViewerRecords(records, statePath);
}

export function removeViewer(pid: number, statePath = getViewersStatePath()): void {
  const records = readViewerRecords(statePath).filter((viewer) => viewer.pid !== pid);
  writeViewerRecords(records, statePath);
}

async function requestViewerStop(record: ViewerRecord): Promise<StopRequestResult> {
  try {
    const response = await fetch(`http://${record.host}:${record.port}/__code-canvas/stop`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ token: record.token }),
    });

    if (response.ok) {
      return { stopped: true, stale: false };
    }

    return { stopped: false, stale: false, error: `Viewer ${record.pid} refused stop request: ${response.status}` };
  } catch {
    return { stopped: false, stale: true };
  }
}

export async function stopViewers(
  statePath = getViewersStatePath(),
  stopRequest: StopRequest = requestViewerStop,
): Promise<StopViewerResult> {
  const records = readViewerRecords(statePath);
  if (records.length === 0) {
    return { stopped: 0, stale: 0, failures: [] };
  }

  const remaining: ViewerRecord[] = [];
  let stopped = 0;
  let stale = 0;
  const failures: string[] = [];

  for (const record of records) {
    if (record.pid === process.pid) {
      remaining.push(record);
      continue;
    }

    const result = await stopRequest(record);
    if (result.stopped) {
      stopped += 1;
      continue;
    }

    if (result.stale) {
      stale += 1;
      continue;
    }

    failures.push(result.error ?? `Unable to stop viewer ${record.pid}`);
    remaining.push(record);
  }

  writeViewerRecords(remaining, statePath);
  return { stopped, stale, failures };
}
