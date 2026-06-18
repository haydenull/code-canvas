import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toReactFlowElements, type LogicFlowNode, type LogicNodeData } from "../shared/flow";
import { validateLogicArtifact, type LogicArtifact } from "../shared/schema";
import "./styles.css";

function LogicNode({ data, selected }: NodeProps<LogicFlowNode>) {
  return (
    <div className={`logic-node ${selected ? "is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="logic-node__kind">{data.kind}</div>
      <div className="logic-node__label">{data.label}</div>
      <div className="logic-node__summary">{data.summary}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { logic: LogicNode };

function DetailPanel({ node, artifact }: { node: LogicFlowNode | null; artifact: LogicArtifact }) {
  const data: LogicNodeData | undefined = node?.data;

  return (
    <aside className="details">
      <div>
        <p className="details__eyebrow">Code Canvas</p>
        <h1>{artifact.title}</h1>
      </div>
      <dl>
        <div>
          <dt>Entry</dt>
          <dd>{artifact.entry.name}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {artifact.entry.file}:{artifact.entry.startLine}-{artifact.entry.endLine}
          </dd>
        </div>
        <div>
          <dt>Artifact</dt>
          <dd>{artifact.artifact.id}</dd>
        </div>
      </dl>

      {data ? (
        <section className="node-detail">
          <p className="details__eyebrow">Selected Node</p>
          <h2>{data.label}</h2>
          <p>{data.summary}</p>
          {data.codeRef ? (
            <p className="code-ref">
              {data.codeRef.file}:{data.codeRef.startLine}-{data.codeRef.endLine}
            </p>
          ) : null}
          {data.code ? <pre>{data.code}</pre> : null}
        </section>
      ) : (
        <p className="empty-state">Select a node to inspect its logic details.</p>
      )}

      {artifact.notes.length > 0 ? (
        <section className="notes">
          <p className="details__eyebrow">Notes</p>
          <ul>
            {artifact.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function App() {
  const [artifact, setArtifact] = useState<LogicArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<LogicFlowNode | null>(null);

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
          onNodeClick={(_event, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </section>
      <DetailPanel node={selectedNode} artifact={artifact} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
