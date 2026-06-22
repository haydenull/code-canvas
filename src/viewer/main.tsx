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
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { codeToHtml, type BundledLanguage, type DecorationItem } from "shiki";
import "@xyflow/react/dist/style.css";
import { toReactFlowElements, type LogicCodeHighlight, type LogicFlowElementNode, type LogicFlowNode } from "../shared/flow";
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

const codeAnchorTopPadding = 20;
const codeLineHeight = 14.5;

function createDecorations(code: string, highlights: LogicCodeHighlight[] = []): DecorationItem[] {
  const lines = code.split("\n");
  const seenWords = new Set<string>();
  const seenLines = new Set<number>();

  return highlights.flatMap((highlight) => {
    const line = lines[highlight.line - 1];
    const character = line?.indexOf(highlight.text) ?? -1;
    if (character < 0) {
      return [];
    }

    const key = `${highlight.line}:${character}:${highlight.text.length}`;
    if (seenWords.has(key)) {
      return [];
    }
    seenWords.add(key);

    const lineIndex = highlight.line - 1;
    const decorations: DecorationItem[] = [];

    if (!seenLines.has(lineIndex)) {
      seenLines.add(lineIndex);
      decorations.push({
        start: { line: lineIndex, character: 0 },
        end: { line: lineIndex, character: line.length },
        properties: { class: "logic-node__code-line-highlight" },
      });
    }

    decorations.push({
      start: { line: lineIndex, character },
      end: { line: lineIndex, character: character + highlight.text.length },
      properties: { class: "logic-node__code-highlight" },
      alwaysWrap: true,
    });

    return decorations;
  });
}

function getHighlightHandleTop(line: number): number {
  return codeAnchorTopPadding + (line - 1) * codeLineHeight + codeLineHeight / 2;
}

function SourceCode({
  code,
  file,
  nodeId,
  codeHighlights,
}: {
  code: string;
  file?: string;
  nodeId: string;
  codeHighlights?: LogicCodeHighlight[];
}) {
  const [html, setHtml] = useState<string | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const anchoredHighlights = codeHighlights?.filter((highlight) => highlight.handleId && highlight.node) ?? [];

  useEffect(() => {
    let cancelled = false;
    setHtml(null);

    codeToHtml(code, {
      lang: getCodeLanguage(file),
      theme: "github-light",
      decorations: createDecorations(code, codeHighlights),
    }).then((nextHtml) => {
      if (!cancelled) {
        setHtml(nextHtml);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, file, codeHighlights]);

  useEffect(() => {
    if (html) {
      updateNodeInternals(nodeId);
    }
  }, [html, nodeId, updateNodeInternals]);

  if (!html) {
    return <pre className="logic-node__code nodrag nowheel">{code}</pre>;
  }

  return (
    <div className="logic-node__code nodrag nowheel">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {anchoredHighlights.map((highlight) => (
        <Handle
          className="logic-node__code-handle"
          id={highlight.handleId}
          key={highlight.handleId}
          type={highlight.node === "source" ? "source" : "target"}
          position={highlight.node === "source" ? Position.Right : Position.Left}
          style={{ top: getHighlightHandleTop(highlight.line) }}
        />
      ))}
    </div>
  );
}

function LogicNode({ id, data }: NodeProps<LogicFlowNode>) {
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
          {data.code ? (
            <SourceCode code={data.code} file={data.codeRef?.file} nodeId={id} codeHighlights={data.codeHighlights} />
          ) : null}
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
