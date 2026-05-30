// src/lib/blockIcons.ts
// Shared lucide icon per block category — used by the canvas node and the palette.

import {
  Activity,
  ClipboardCheck,
  Flag,
  GitBranch,
  LogIn,
  Pill,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/schema/pathway-schema";

export const BLOCK_TYPE_ICON: Record<BlockType, LucideIcon> = {
  entry: LogIn,
  assessment: ClipboardCheck,
  decision: GitBranch,
  treatment: Pill,
  monitoring: Activity,
  outcome: Flag,
};

/** Display order + labels for the six block categories (palette tabs, etc). */
export const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "entry", label: "Entry" },
  { value: "assessment", label: "Assess" },
  { value: "decision", label: "Decide" },
  { value: "treatment", label: "Treat" },
  { value: "monitoring", label: "Monitor" },
  { value: "outcome", label: "Outcome" },
];
