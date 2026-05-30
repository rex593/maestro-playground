// src/inspector/InspectorPane.tsx
// Right inspector. Selection-driven: empty state, or the selected node's header +
// schema-driven properties form + (for gates) branch picker + delete action.

import { Trash2 } from "lucide-react";
import { usePathwayStore } from "@/state/usePathwayStore";
import { getBlock } from "@/state/catalog";
import { BLOCK_TYPE_ICON } from "@/lib/blockIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/inspector/EmptyState";
import { NodePropertiesForm } from "@/inspector/NodePropertiesForm";
import { BranchPicker } from "@/inspector/BranchPicker";

export function InspectorPane() {
  const selectedNodeId = usePathwayStore((s) => s.selectedNodeId);
  const selectedEdgeId = usePathwayStore((s) => s.selectedEdgeId);
  const node = usePathwayStore((s) =>
    s.nodes.find((n) => n.id === s.selectedNodeId)
  );
  const removeNode = usePathwayStore((s) => s.removeNode);

  if (!selectedNodeId) {
    return (
      <EmptyState
        hint={
          selectedEdgeId
            ? "Edges have no properties yet."
            : "Select a block to edit its properties."
        }
      />
    );
  }

  if (!node) return <EmptyState />;

  const def = getBlock(node.data.blockId);
  const Icon = def ? BLOCK_TYPE_ICON[def.type] : Trash2;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-2 border-b p-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {def?.label ?? node.data.blockId}
          </div>
          {def && (
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {def.type}
              </Badge>
              {def.evidenceGrade && (
                <Badge variant="secondary" className="text-[10px]">
                  Grade {def.evidenceGrade}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {/* key by nodeId so the form resets when the selection changes */}
          <NodePropertiesForm key={node.id} nodeId={node.id} />
          {def?.isGate && (
            <>
              <Separator />
              <BranchPicker nodeId={node.id} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => removeNode(node.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete block
        </Button>
      </div>
    </div>
  );
}

export default InspectorPane;
