// src/io/MissingBlockNode.tsx
// React Flow custom node for an orphaned block — one whose blockId is no longer
// in the catalog. Renders a "Replace…" affordance that opens a CommandDialog
// surfacing fuzzy catalog matches (confidence + reason) above the full catalog.
// Picking a block rewrites node.data.blockId and re-runs drift detection live.

import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Replace } from "lucide-react";
import { findClosestBlockMatches } from "@/schema/pathway-schema";
import { catalog } from "@/state/catalog";
import {
  usePathwayStore,
  type FlowNode,
} from "@/state/usePathwayStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const REASON_LABEL: Record<string, string> = {
  exact: "exact",
  prefix: "prefix",
  substring: "substring",
  fuzzy: "fuzzy",
  "type-fallback": "type",
};

export function MissingBlockNode({ id, data }: NodeProps<FlowNode>) {
  const [open, setOpen] = useState(false);
  const updateNode = usePathwayStore((s) => s.updateNode);
  const recomputeDrift = usePathwayStore((s) => s.recomputeDrift);

  const missingId = data.blockId;

  const matches = useMemo(
    () => findClosestBlockMatches(missingId, catalog, { limit: 5 }),
    [missingId]
  );

  const alphabetical = useMemo(
    () => [...catalog.blocks].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  function replaceWith(blockId: string) {
    updateNode(id, {
      type: "pathwayNode",
      data: { ...data, blockId },
    });
    // Re-run drift so the DriftBanner reflects the resolved block immediately.
    recomputeDrift();
    setOpen(false);
  }

  return (
    <div className="rounded-md border-2 border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[140px] truncate font-mono text-xs text-destructive">
              {missingId}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            missing from catalog v{catalog.catalogVersion}
          </TooltipContent>
        </Tooltip>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 h-7 w-full text-xs"
        onClick={() => setOpen(true)}
      >
        <Replace className="mr-1 h-3 w-3" />
        Replace…
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={`Replace "${missingId}" with…`} />
        <CommandList>
          <CommandEmpty>No catalog blocks found.</CommandEmpty>
          {matches.length > 0 && (
            <CommandGroup heading="Closest matches">
              {matches.map((m) => (
                <CommandItem
                  key={`match-${m.blockId}`}
                  value={`match-${m.blockId}`}
                  onSelect={() => replaceWith(m.blockId)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{m.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {REASON_LABEL[m.reason] ?? m.reason}
                    </Badge>
                    <Badge className="text-[10px]">
                      {Math.round(m.confidence * 100)}%
                    </Badge>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="All blocks">
            {alphabetical.map((b) => (
              <CommandItem
                key={b.id}
                value={b.id}
                onSelect={() => replaceWith(b.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{b.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {b.type}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default MissingBlockNode;
