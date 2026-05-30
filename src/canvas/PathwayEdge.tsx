// src/canvas/PathwayEdge.tsx
// React Flow custom edge registered as "pathwayEdge". Animated dashed bezier,
// colored by edge.data.kind, with a matching arrowhead marker (defs live in
// CanvasPane) and an optional centered label pill.

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { FlowEdge } from "@/state/usePathwayStore";

type EdgeKind = NonNullable<FlowEdge["data"]>["kind"];

/** Stroke color per edge kind — also used by CanvasPane to build arrow markers. */
export const EDGE_COLORS: Record<EdgeKind, string> = {
  sequential: "#a3a3a3", // neutral-400
  out_of_sequence: "#ef4444", // red-500
  parallel: "#ec4899", // pink-500
  handoff: "var(--accent-active)",
};

export const PathwayEdge = memo(function PathwayEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowEdge>) {
  const kind: EdgeKind = data?.kind ?? "sequential";
  const color = EDGE_COLORS[kind];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={`url(#pathway-arrow-${kind})`}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: "6 3",
          animation: "pathway-dash 1.5s linear infinite",
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default PathwayEdge;
