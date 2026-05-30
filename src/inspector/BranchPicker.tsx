// src/inspector/BranchPicker.tsx
// Shown only for gate blocks (def.isGate). Renders each catalog branch as a
// selectable card; the chosen branch (node.data.branchSelection) gets an accent
// border. Selecting writes branchSelection back to the node.

import { getBlock, getBranches } from "@/state/catalog";
import { usePathwayStore } from "@/state/usePathwayStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function BranchPicker({ nodeId }: { nodeId: string }) {
  const node = usePathwayStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = usePathwayStore((s) => s.updateNode);
  const def = node ? getBlock(node.data.blockId) : undefined;

  if (!node || !def?.isGate) return null;
  const branches = getBranches(def.id);
  if (branches.length === 0) return null;

  const selected = node.data.branchSelection;

  function choose(branchId: string) {
    updateNode(nodeId, { data: { branchSelection: branchId } });
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Branch
      </h4>
      <div className="space-y-2">
        {branches.map((b) => {
          const isSelected = selected === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => choose(b.id)}
              className={cn(
                "w-full rounded-md border bg-card p-2.5 text-left text-sm transition-colors hover:bg-accent",
                isSelected && "border-2"
              )}
              style={
                isSelected
                  ? { borderColor: "var(--accent-active)" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium leading-tight">{b.label}</span>
                {b.isDefault && (
                  <Badge variant="secondary" className="text-[10px]">
                    default
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {b.whoDecides}
                </Badge>
                <span className="text-xs tabular-nums text-muted-foreground">
                  ×{b.effect}
                </span>
              </div>
              {b.note && (
                <p className="mt-1 text-[11px] italic leading-snug text-muted-foreground">
                  {b.note}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BranchPicker;
