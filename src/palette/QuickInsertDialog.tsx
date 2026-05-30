// src/palette/QuickInsertDialog.tsx
// Cmd-K / Ctrl-K command palette. Lists every catalog block (cmdk handles fuzzy
// search). On Enter, inserts the block near the visible viewport center.

import { useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { BLOCK_TYPE_ICON } from "@/lib/blockIcons";
import { catalog } from "@/state/catalog";
import { usePathwayStore } from "@/state/usePathwayStore";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function QuickInsertDialog() {
  const [open, setOpen] = useState(false);
  const addNode = usePathwayStore((s) => s.addNode);
  const selectNode = usePathwayStore((s) => s.selectNode);
  const { screenToFlowPosition } = useReactFlow();

  // Cmd-K / Ctrl-K toggles the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function insert(blockId: string) {
    // Insert near the visible center of the viewport.
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const id = addNode({ blockId, position });
    selectNode(id);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Insert a block…" />
      <CommandList>
        <CommandEmpty>No blocks found.</CommandEmpty>
        <CommandGroup heading="Catalog blocks">
          {catalog.blocks.map((b) => {
            const Icon = BLOCK_TYPE_ICON[b.type];
            return (
              <CommandItem
                key={b.id}
                value={`${b.label} ${b.id} ${b.shortLabel ?? ""}`}
                onSelect={() => insert(b.id)}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{b.label}</span>
                <span className="text-xs text-muted-foreground">{b.type}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default QuickInsertDialog;
