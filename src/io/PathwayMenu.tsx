// src/io/PathwayMenu.tsx
// Top-bar dropdown for document IO: New, Open from file, Save to file, Copy
// share link. Replaces the Task 0 stub.

import { useRef } from "react";
import { toast } from "sonner";
import { ChevronDown, FilePlus2, FolderOpen, Save, Share2 } from "lucide-react";
import { ZodError } from "zod";
import { makeEmptyPathway } from "@/schema/pathway-schema";
import { catalogVersion } from "@/state/catalog";
import { usePathwayStore } from "@/state/usePathwayStore";
import { fromDocument } from "@/io/deserialize";
import { encodeShareHash } from "@/io/shareLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PathwayMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadPathway = usePathwayStore((s) => s.loadPathway);
  const savePathway = usePathwayStore((s) => s.savePathway);

  function handleNew() {
    loadPathway(makeEmptyPathway("untitled", "Untitled", catalogVersion));
    toast.success("New pathway");
  }

  function handleOpenClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-opening the same file
    if (!file) return;
    try {
      const { doc, drift } = fromDocument(JSON.parse(await file.text()));
      const result = loadPathway(doc);
      const breaking =
        result.drift.missingBlockIds.length > 0 ||
        result.drift.missingBranchIds.length > 0;
      if (breaking) {
        toast.warning(`Opened "${doc.meta.title}" with catalog drift`);
      } else if (drift.paramSchemaChanges.length) {
        toast.warning(`Opened "${doc.meta.title}" (soft drift)`);
      } else {
        toast.success(`Opened "${doc.meta.title}"`);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        toast.error("Invalid pathway file", {
          description: "The JSON did not match the pathway schema.",
        });
      } else {
        toast.error("Could not open file", {
          description: (err as Error).message,
        });
      }
    }
  }

  function handleSave() {
    try {
      const doc = savePathway();
      const blob = new Blob([JSON.stringify(doc, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.meta.id}.pathway.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Saved to file");
    } catch (err) {
      toast.error("Could not save", { description: (err as Error).message });
    }
  }

  async function handleShare() {
    try {
      const doc = savePathway();
      const url =
        window.location.origin +
        window.location.pathname +
        encodeShareHash(doc);
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch (err) {
      toast.error("Could not create share link", {
        description: (err as Error).message,
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            Pathway
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onSelect={handleNew}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            New
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleOpenClick}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open from file…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save to file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Copy share link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

export default PathwayMenu;
