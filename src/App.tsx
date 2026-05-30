import { useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import PalettePane from "@/palette/PalettePane";
import CanvasPane from "@/canvas/CanvasPane";
import InspectorPane from "@/inspector/InspectorPane";
import PathwayMenu from "@/io/PathwayMenu";
import DriftBanner from "@/io/DriftBanner";
import { usePathwayStore } from "@/state/usePathwayStore";
import { fromDocument } from "@/io/deserialize";
import { decodeShareHash } from "@/io/shareLink";

export function App() {
  const loadPathway = usePathwayStore((s) => s.loadPathway);

  // Open a pathway encoded in the URL hash (#p=...) on first mount.
  useEffect(() => {
    const payload = decodeShareHash(window.location.hash);
    if (!payload) return;
    try {
      const { doc } = fromDocument(payload);
      loadPathway(doc);
    } catch {
      // Ignore malformed share links — start from the empty document.
    }
  }, [loadPathway]);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <span className="text-sm font-semibold tracking-tight">
            Maestro Pathway Builder
          </span>
          <PathwayMenu />
        </header>

        {/* Drift banner (renders only when the loaded pathway has drift) */}
        <DriftBanner />

        {/* Three-pane shell */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={20} minSize={12}>
            <PalettePane />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30}>
            <CanvasPane />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15}>
            <InspectorPane />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
