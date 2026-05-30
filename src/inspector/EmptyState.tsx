// src/inspector/EmptyState.tsx
// Shown in the inspector when nothing (or only an edge) is selected.

import { MousePointerClick } from "lucide-react";

export function EmptyState({ hint }: { hint?: string }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="space-y-2 text-muted-foreground">
        <MousePointerClick className="mx-auto h-6 w-6" />
        <p className="text-sm">{hint ?? "Select a block to edit its properties."}</p>
      </div>
    </div>
  );
}

export default EmptyState;
