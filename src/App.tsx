import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import PalettePane from "@/palette/PalettePane";
import CanvasPane from "@/canvas/CanvasPane";
import InspectorPane from "@/inspector/InspectorPane";
import PathwayMenu from "@/io/PathwayMenu";

export function App() {
  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-semibold tracking-tight">
          Maestro Pathway Builder
        </span>
        <PathwayMenu />
      </header>

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
  );
}

export default App;
