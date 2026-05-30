// src/palette/PaletteCard.tsx
// A draggable catalog block. Uses NATIVE HTML5 drag (NOT dnd-kit) because React
// Flow's drop zone only accepts native dataTransfer drops.

import { BLOCK_TYPE_ICON } from "@/lib/blockIcons";
import { Badge } from "@/components/ui/badge";
import type { BlockDefinition } from "@/schema/pathway-schema";

export const PALETTE_MIME = "application/x-pathway-block";

export function PaletteCard({ def }: { def: BlockDefinition }) {
  const Icon = BLOCK_TYPE_ICON[def.type];

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(PALETTE_MIME, JSON.stringify({ blockId: def.id }));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm shadow-sm transition-colors hover:bg-accent active:cursor-grabbing"
      style={{ borderLeft: `4px solid var(--block-${def.type})` }}
      title={def.description ?? def.label}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{def.label}</div>
        {def.shortLabel && (
          <div className="truncate text-xs text-muted-foreground">
            {def.shortLabel}
          </div>
        )}
      </div>
      {def.evidenceGrade && (
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
          {def.evidenceGrade}
        </Badge>
      )}
    </div>
  );
}

export default PaletteCard;
