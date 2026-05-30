// src/state/catalog.ts
// Loads the committed catalog/catalog.json, validates it at module init against
// CatalogDocumentSchema (throws on failure so a bad catalog never reaches the UI),
// and exposes typed lookups every pane shares.

import catalogJson from "../../catalog/catalog.json";
import {
  CatalogDocumentSchema,
  type BlockDefinition,
  type Branch,
} from "@/schema/pathway-schema";

const parsed = CatalogDocumentSchema.safeParse(catalogJson);
if (!parsed.success) {
  // Fail loud and early — a malformed catalog is a build/authoring bug.
  throw new Error(
    "catalog/catalog.json failed CatalogDocumentSchema validation:\n" +
      JSON.stringify(parsed.error.format(), null, 2)
  );
}

export const catalog = parsed.data;
export const catalogVersion = catalog.catalogVersion;

const blockIndex = new Map<string, BlockDefinition>(
  catalog.blocks.map((b) => [b.id, b])
);

export function getBlock(id: string): BlockDefinition | undefined {
  return blockIndex.get(id);
}

export function getBranches(blockId: string): Branch[] {
  return catalog.branches[blockId] ?? [];
}
