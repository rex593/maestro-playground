// src/io/DriftBanner.tsx
// Mounts at app root. Subscribes to the store's most-recent CatalogDriftReport.
// When drift is present it fires a sonner toast and shows a sticky banner with a
// one-line summary + a "View report" button that opens a Sheet with the full,
// readable report. Renders nothing when there's no drift.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { CatalogDriftReport } from "@/schema/pathway-schema";
import { usePathwayStore } from "@/state/usePathwayStore";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function summarize(drift: CatalogDriftReport): string {
  const parts: string[] = [];
  if (drift.missingBlockIds.length)
    parts.push(
      `${drift.missingBlockIds.length} missing block${
        drift.missingBlockIds.length === 1 ? "" : "s"
      }`
    );
  if (drift.missingBranchIds.length)
    parts.push(
      `${drift.missingBranchIds.length} missing branch${
        drift.missingBranchIds.length === 1 ? "" : "es"
      }`
    );
  if (drift.paramSchemaChanges.length)
    parts.push(`${drift.paramSchemaChanges.length} param change(s)`);
  return parts.join(", ") || "no drift";
}

export function DriftBanner() {
  const drift = usePathwayStore((s) => s.lastDrift);
  const lastShown = useRef<string | null>(null);

  useEffect(() => {
    if (!drift) {
      lastShown.current = null;
      return;
    }
    const summary = summarize(drift);
    // Fire the toast once per distinct drift summary.
    if (lastShown.current !== summary) {
      lastShown.current = summary;
      toast.warning("Catalog drift detected", { description: summary });
    }
  }, [drift]);

  if (!drift) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        This pathway was authored against catalog v{drift.authoredAgainst}.{" "}
        <strong>{summarize(drift)}</strong> vs. current v{drift.currentVersion}.
      </span>
      <Sheet>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="h-7">
            View report
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[420px] overflow-y-auto sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Catalog drift report</SheetTitle>
            <SheetDescription>
              Authored against v{drift.authoredAgainst} · current v
              {drift.currentVersion}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4 text-sm">
            <section>
              <h4 className="mb-1 font-semibold">
                Missing blocks ({drift.missingBlockIds.length})
              </h4>
              {drift.missingBlockIds.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul className="list-disc pl-5 font-mono text-xs">
                  {drift.missingBlockIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="mb-1 font-semibold">
                Missing branches ({drift.missingBranchIds.length})
              </h4>
              {drift.missingBranchIds.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul className="list-disc pl-5 font-mono text-xs">
                  {drift.missingBranchIds.map((m) => (
                    <li key={`${m.nodeId}-${m.branchId}`}>
                      {m.nodeId} → {m.branchId}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="mb-1 font-semibold">
                Param changes ({drift.paramSchemaChanges.length})
              </h4>
              {drift.paramSchemaChanges.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {drift.paramSchemaChanges.map((c) => (
                    <li key={c.nodeId} className="font-mono">
                      {c.blockId} ({c.nodeId}): dropped{" "}
                      {c.droppedKeys.join(", ") || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default DriftBanner;
