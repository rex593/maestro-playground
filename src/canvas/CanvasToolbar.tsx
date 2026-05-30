// src/canvas/CanvasToolbar.tsx
// React Flow top-right panel: undo/redo (zundo), auto-layout (dagre), fit view.

import { Panel, useReactFlow } from "@xyflow/react";
import { Maximize, Redo2, Undo2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePathwayStore, useTemporalStore } from "@/state/usePathwayStore";
import { layoutDagre } from "@/canvas/layout/dagre";

export function CanvasToolbar() {
  const { fitView } = useReactFlow();
  const setNodes = usePathwayStore((s) => s.setNodes);
  const setEdges = usePathwayStore((s) => s.setEdges);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  function handleLayout() {
    const { nodes, edges } = usePathwayStore.getState();
    const laidOut = layoutDagre(nodes, edges);
    setNodes(laidOut.nodes);
    setEdges(laidOut.edges);
    // Defer fit until React Flow has the new positions.
    window.requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));
  }

  return (
    <Panel
      position="top-right"
      className="flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur"
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canUndo}
        onClick={() => undo()}
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canRedo}
        onClick={() => redo()}
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1"
        onClick={handleLayout}
        title="Auto-layout"
      >
        <Workflow className="h-4 w-4" />
        Layout
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1"
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        title="Fit view"
      >
        <Maximize className="h-4 w-4" />
        Fit
      </Button>
    </Panel>
  );
}

export default CanvasToolbar;
