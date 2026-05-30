// src/io/deserialize.ts
// Parses untrusted JSON into a validated PathwayDocument and reports any drift
// against the current catalog. Throws ZodError on structurally-invalid input;
// drift (missing blocks/branches, dropped params) is returned, not thrown — a
// drifted pathway is still openable (missing blocks render as placeholders).

import {
  PathwayDocumentSchema,
  detectCatalogDrift,
  type PathwayDocument,
  type CatalogDriftReport,
} from "@/schema/pathway-schema";
import { catalog } from "@/state/catalog";

export interface DeserializeResult {
  doc: PathwayDocument;
  drift: CatalogDriftReport;
}

/**
 * Pre-validation migration hook. Pathway docs carry meta.schemaVersion; when we
 * bump CURRENT_SCHEMA_VERSION, add cases here that lift older payloads up to the
 * current shape before PathwayDocumentSchema.parse runs.
 */
function migrateRaw(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const meta = (input as { meta?: { schemaVersion?: unknown } }).meta;
  const version = typeof meta?.schemaVersion === "number" ? meta.schemaVersion : 1;
  switch (version) {
    // case 0: return liftV0toV1(input); // wire up when v2 lands
    case 1:
    default:
      return input;
  }
}

export function fromDocument(input: unknown): DeserializeResult {
  const migrated = migrateRaw(input);
  const doc = PathwayDocumentSchema.parse(migrated); // throws ZodError on bad data
  const drift = detectCatalogDrift(doc, catalog);
  return { doc, drift };
}
