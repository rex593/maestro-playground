// src/palette/PalettePane.tsx
// Left palette: one tab per block category, debounced search, a (virtualized
// when long) list of draggable PaletteCards, and a collapsible Saved Runs
// section. Mounts the Cmd-K quick-insert dialog.

import { useMemo, useState } from "react";
import { FixedSizeList } from "react-window";
import { ChevronsUpDown } from "lucide-react";
import type { BlockType } from "@/schema/pathway-schema";
import { catalog } from "@/state/catalog";
import { BLOCK_TYPES } from "@/lib/blockIcons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PaletteCard } from "@/palette/PaletteCard";
import { PaletteSearch } from "@/palette/PaletteSearch";
import { SavedRunsList } from "@/palette/SavedRunsList";
import { QuickInsertDialog } from "@/palette/QuickInsertDialog";

const ROW_HEIGHT = 56;
const VIRTUALIZE_THRESHOLD = 30;

function BlockList({ type, query }: { type: BlockType; query: string }) {
  const blocks = useMemo(
    () =>
      catalog.blocks
        .filter((b) => b.type === type)
        .filter(
          (b) =>
            !query ||
            b.label.toLowerCase().includes(query) ||
            b.id.toLowerCase().includes(query) ||
            (b.shortLabel?.toLowerCase().includes(query) ?? false)
        ),
    [type, query]
  );

  if (blocks.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
        No blocks{query ? " match your search" : " in this category yet"}.
      </p>
    );
  }

  if (blocks.length > VIRTUALIZE_THRESHOLD) {
    return (
      <FixedSizeList
        height={Math.min(blocks.length, 10) * ROW_HEIGHT}
        itemCount={blocks.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {({ index, style }) => (
          <div style={style} className="pb-1.5 pr-1">
            <PaletteCard def={blocks[index]} />
          </div>
        )}
      </FixedSizeList>
    );
  }

  return (
    <div className="space-y-1.5">
      {blocks.map((b) => (
        <PaletteCard key={b.id} def={b} />
      ))}
    </div>
  );
}

export function PalettePane() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<BlockType>("entry");

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as BlockType)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="space-y-2 p-2">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0">
            {BLOCK_TYPES.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-7 border text-xs data-[state=active]:bg-accent"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <PaletteSearch onChange={setQuery} />
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2">
          {BLOCK_TYPES.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-0">
              <BlockList type={t.value} query={query} />
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>

      <Collapsible className="border-t">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-accent">
          Saved Runs
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="max-h-48 overflow-y-auto px-2 pb-2">
          <SavedRunsList />
        </CollapsibleContent>
      </Collapsible>

      <QuickInsertDialog />
    </div>
  );
}

export default PalettePane;
