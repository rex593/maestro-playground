// src/canvas/PathwayNode.tsx
// React Flow custom node registered as "pathwayNode". Resolves its
// BlockDefinition from the catalog and renders a card colored by block category
// (4px left border), with cost, evidence grade, and an optional whoDecides /
// branch-selection chip.

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { getBlock, getBranches } from "@/state/catalog";
import { cn } from "@/lib/utils";
import { BLOCK_TYPE_ICON } from "@/lib/blockIcons";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/state/usePathwayStore";

export const PathwayNode = memo(function PathwayNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const def = getBlock(data.blockId);

  if (!def) {
    // Should be re-typed to "missingBlock" on load; render a safe fallback.
    return (
      <div className="rounded-md border border-destructive bg-destructive/5 px-3 py-2 text-xs">
        <Handle type="target" position={Position.Top} />
        <span className="font-mono text-destructive">{data.blockId}</span>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  const Icon = BLOCK_TYPE_ICON[def.type] ?? HelpCircle;
  const branchLabel =
    data.branchSelection &&
    getBranches(def.id).find((b) => b.id === data.branchSelection)?.label;

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[220px] rounded-md border bg-card text-card-foreground shadow-sm transition-shadow",
        selected && "ring-2 ring-ring"
      )}
      style={{ borderLeft: `4px solid var(--block-${def.type})` }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 px-3 pt-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium">
          {def.label}
        </span>
        {def.evidenceGrade && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {def.evidenceGrade}
          </Badge>
        )}
      </div>

      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {def.shortLabel ?? def.description ?? ""}
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums">
            ${def.costPerPatient}
          </span>
        </div>

        {def.whoDecides && (
          <span
            className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: "var(--accent-active)" }}
          >
            {def.whoDecides}
          </span>
        )}

        {branchLabel && (
          <div className="mt-1 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ↳ {branchLabel}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

export default PathwayNode;
