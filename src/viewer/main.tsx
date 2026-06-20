import { StrictMode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  PanOnScrollMode,
  Position,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { codeToHtml, type BundledLanguage } from "shiki";
import "@xyflow/react/dist/style.css";
import { toReactFlowElements, type LogicFlowElementNode, type LogicFlowNode } from "../shared/flow";
import { validateLogicArtifact, type LogicArtifact } from "../shared/schema";
import "./styles.css";

function moduleThemeStyle(theme: LogicFlowNode["data"]["moduleTheme"]): CSSProperties | undefined {
  if (!theme) {
    return undefined;
  }
  return {
    "--module-accent": theme.accent,
    "--module-border": theme.border,
    "--module-background": theme.background,
  } as CSSProperties;
}

const languageByExtension: Record<string, BundledLanguage> = {
  c: "c",
  cpp: "cpp",
  css: "css",
  go: "go",
  html: "html",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  md: "markdown",
  py: "python",
  rs: "rust",
  sh: "shellscript",
  ts: "typescript",
  tsx: "tsx",
  yaml: "yaml",
  yml: "yaml",
};

function getCodeLanguage(file?: string): BundledLanguage {
  const extension = file?.split(".").pop()?.toLowerCase();
  return extension ? (languageByExtension[extension] ?? "log") : "log";
}

function SourceCode({ code, file }: { code: string; file?: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);

    codeToHtml(code, {
      lang: getCodeLanguage(file),
      theme: "github-light",
    }).then((nextHtml) => {
      if (!cancelled) {
        setHtml(nextHtml);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, file]);

  if (!html) {
    return <pre className="logic-node__code nodrag nowheel">{code}</pre>;
  }

  return <div className="logic-node__code nodrag nowheel" dangerouslySetInnerHTML={{ __html: html }} />;
}

function LogicNode({ data }: NodeProps<LogicFlowNode>) {
  return (
    <div className="logic-node" style={moduleThemeStyle(data.moduleTheme)}>
      <Handle type="target" position={Position.Left} />
      <div className="logic-node__kind">{data.kind}</div>
      <div className="logic-node__label">{data.label}</div>
      <div className="logic-node__summary">{data.summary}</div>
      {data.codeRef || data.code ? (
        <div className="logic-node__detail">
          {data.codeRef ? (
            <p className="logic-node__ref">
              {data.codeRef.file}:{data.codeRef.startLine}-{data.codeRef.endLine}
            </p>
          ) : null}
          {data.code ? <SourceCode code={data.code} file={data.codeRef?.file} /> : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ModuleGroupNode({ data }: NodeProps<Extract<LogicFlowElementNode, { type: "moduleGroup" }>>) {
  return (
    <div className="module-group" style={moduleThemeStyle(data.moduleTheme)}>
      <div className="module-group__label">{data.file}</div>
      <div className="module-group__count">{data.nodeCount} nodes</div>
    </div>
  );
}

const nodeTypes = { logic: LogicNode, moduleGroup: ModuleGroupNode };

function ArtifactPanel({ artifact }: { artifact: LogicArtifact }) {
  return (
    <Panel position="top-left" className="artifact-panel">
      <p className="artifact-panel__eyebrow">Code Canvas</p>
      <h1>{artifact.title}</h1>
      <p>
        {artifact.entry.name} · {artifact.entry.file}:{artifact.entry.startLine}-{artifact.entry.endLine}
      </p>
    </Panel>
  );
}

function App() {
  const [artifact, setArtifact] = useState<LogicArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/artifact.json")
      .then(async (response) => validateLogicArtifact(await response.json()))
      .then(setArtifact)
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  const elements = useMemo(() => (artifact ? toReactFlowElements(artifact) : null), [artifact]);

  if (error) {
    return <main className="status">Unable to load artifact: {error}</main>;
  }
  if (!artifact || !elements) {
    return <main className="status">Loading artifact...</main>;
  }

  return (
    <main className="app">
      <section className="canvas" aria-label="Code logic flow">
        <ReactFlow
          nodes={elements.nodes}
          edges={elements.edges}
          nodeTypes={nodeTypes}
          fitView
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
        >
          <ArtifactPanel artifact={artifact} />
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
