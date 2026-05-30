// src/canvas/CanvasPane.tsx
// The center canvas. React Flow wired to the Zustand store, with custom node and
// edge types, colored arrowhead markers, palette drop target, and the toolbar.

import { useCallback, useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeTypes,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { usePathwayStore, type FlowNode } from "@/state/usePathwayStore";
import { getBlock } from "@/state/catalog";
import PathwayNode from "@/canvas/PathwayNode";
import PathwayEdge, { EDGE_COLORS } from "@/canvas/PathwayEdge";
import MissingBlockNode from "@/io/MissingBlockNode";
import CanvasToolbar from "@/canvas/CanvasToolbar";

const PALETTE_MIME = "application/x-pathway-block";

const nodeTypes: NodeTypes = {
  pathwayNode: PathwayNode,
  missingBlock: MissingBlockNode,
};
const edgeTypes: EdgeTypes = {
  pathwayEdge: PathwayEdge,
};

/** Colored arrowhead markers referenced by PathwayEdge via url(#pathway-arrow-*). */
function ArrowMarkers() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden>
      <defs>
        {Object.entries(EDGE_COLORS).map(([kind, color]) => (
          <marker
            key={kind}
            id={`pathway-arrow-${kind}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

function CanvasFlow() {
  const nodes = usePathwayStore((s) => s.nodes);
  const edges = usePathwayStore((s) => s.edges);
  const onNodesChange = usePathwayStore((s) => s.onNodesChange);
  const onEdgesChange = usePathwayStore((s) => s.onEdgesChange);
  const connect = usePathwayStore((s) => s.connect);
  const selectNode = usePathwayStore((s) => s.selectNode);
  const selectEdge = usePathwayStore((s) => s.selectEdge);
  const clearSelection = usePathwayStore((s) => s.clearSelection);
  const addNode = usePathwayStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  // Expose the store for the documented console hand-test.
  useEffect(() => {
    (window as unknown as { __store: typeof usePathwayStore }).__store =
      usePathwayStore;
  }, []);

  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback(
    (_event, node) => selectNode(node.id),
    [selectNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(PALETTE_MIME);
      if (!raw) return;
      try {
        const { blockId } = JSON.parse(raw) as { blockId: string };
        if (!blockId) return;
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addNode({ blockId, position });
      } catch {
        // Ignore drops that aren't pathway blocks.
      }
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ArrowMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connect}
        onNodeClick={onNodeClick}
        onEdgeClick={(_e, edge) => selectEdge(edge.id)}
        onPaneClick={clearSelection}
        defaultEdgeOptions={{ type: "pathwayEdge" }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const def = getBlock((n.data as FlowNode["data"]).blockId);
            return def ? `var(--block-${def.type})` : "#ef4444";
          }}
        />
        <CanvasToolbar />
      </ReactFlow>
    </div>
  );
}

export function CanvasPane() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  );
}

export default CanvasPane;
