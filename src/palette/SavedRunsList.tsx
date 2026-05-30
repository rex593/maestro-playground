// src/palette/SavedRunsList.tsx
// Lists store.savedRuns as draggable rows (dnd-kit useSortable — the only place
// dnd-kit is used in the palette). Reordering writes back via setSavedRuns.

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { GripVertical } from "lucide-react";
import { usePathwayStore, type SavedRun } from "@/state/usePathwayStore";

function SavedRunRow({ run }: { run: SavedRun }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: run.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs ${
        isDragging ? "opacity-60 shadow" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Reorder run"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{run.name}</div>
        <div className="text-muted-foreground">
          {run.blockCount} block{run.blockCount === 1 ? "" : "s"} ·{" "}
          {formatDistanceToNow(new Date(run.savedAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

export function SavedRunsList() {
  const savedRuns = usePathwayStore((s) => s.savedRuns);
  const setSavedRuns = usePathwayStore((s) => s.setSavedRuns);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  if (savedRuns.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">
        No saved runs yet.
      </p>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = savedRuns.findIndex((r) => r.id === active.id);
    const newIndex = savedRuns.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setSavedRuns(arrayMove(savedRuns, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={savedRuns.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {savedRuns.map((run) => (
            <SavedRunRow key={run.id} run={run} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SavedRunsList;
