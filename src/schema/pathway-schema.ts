// pathway-schema.ts
// Shared contract for the Mindspan Care Pathway Builder rebuild.
// Every worktree (canvas, palette, properties-panel, io) imports from this file.
// Author this in the base scaffold BEFORE forking worktrees — it's the only way
// the four parallel branches stay mergeable.

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export const BlockTypeSchema = z.enum([
  "entry",
  "assessment",
  "decision",
  "treatment",
  "monitoring",
  "outcome",
]);
export type BlockType = z.infer<typeof BlockTypeSchema>;

export const WhoDecidesSchema = z.enum([
  "Mindspan",
  "Partner",
  "Payer",
  "Family",
  "Auto",
]);
export type WhoDecides = z.infer<typeof WhoDecidesSchema>;

export const EvidenceGradeSchema = z.enum(["A", "B", "C"]);

/* ------------------------------------------------------------------ */
/* Param schema — drives the properties panel form renderer            */
/* ------------------------------------------------------------------ */

const ParamBase = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  helpText: z.string().optional(),
});

export const ParamFieldSchema = z.discriminatedUnion("kind", [
  ParamBase.extend({
    kind: z.literal("number"),
    defaultValue: z.number(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  }),
  ParamBase.extend({
    kind: z.literal("select"),
    defaultValue: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  ParamBase.extend({
    kind: z.literal("multiselect"),
    defaultValue: z.array(z.string()),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  ParamBase.extend({
    kind: z.literal("boolean"),
    defaultValue: z.boolean(),
  }),
]);
export type ParamField = z.infer<typeof ParamFieldSchema>;

/* ------------------------------------------------------------------ */
/* Block catalog entry — what the palette renders & what `Node.data`   */
/* references via `blockId`                                            */
/* ------------------------------------------------------------------ */

export const BlockDefinitionSchema = z.object({
  id: z.string(),                           // e.g. "moca", "junction_partner_handoff"
  type: BlockTypeSchema,
  label: z.string(),
  shortLabel: z.string().optional(),
  description: z.string().optional(),
  costPerPatient: z.number().default(0),
  evidenceGrade: EvidenceGradeSchema.optional(),
  riskReduction: z.number().default(0),     // 0–100, applied by Cf() at runtime
  cpt: z.string().optional(),

  // Capability flags that change rendering & connection rules
  isEntryHub: z.boolean().optional(),
  isEntryRoute: z.boolean().optional(),
  isGate: z.boolean().optional(),
  isBundle: z.boolean().optional(),
  isEdge: z.boolean().optional(),

  whoDecides: WhoDecidesSchema.optional(),  // first-class for Mirza's partner-control model
  paramSchema: z.array(ParamFieldSchema).default([]),
  defaultParams: z.record(z.unknown()).default({}),
});
export type BlockDefinition = z.infer<typeof BlockDefinitionSchema>;

/* ------------------------------------------------------------------ */
/* Branch — outgoing choice from a decision/gate block                 */
/* ------------------------------------------------------------------ */

export const ParallelLaneSchema = z.object({
  label: z.string(),
  color: z.string().optional(),
  blocks: z.array(z.string()),              // block ids
});

export const BranchSchema = z.object({
  id: z.string(),
  label: z.string(),
  whoDecides: WhoDecidesSchema,
  note: z.string().optional(),
  effect: z.number().default(1),            // risk/cost multiplier
  isDefault: z.boolean().optional(),
  downstreamSwap: z.record(z.string()).optional(), // { fromBlockId: toBlockId }
  parallelLanes: z.array(ParallelLaneSchema).optional(),
});
export type Branch = z.infer<typeof BranchSchema>;

/* ------------------------------------------------------------------ */
/* Node — an instance of a BlockDefinition placed on the canvas        */
/* React Flow's Node<Data> generic plugs in here                       */
/* ------------------------------------------------------------------ */

export const NodeDataSchema = z.object({
  blockId: z.string(),                      // FK to BlockDefinition.id
  params: z.record(z.unknown()).default({}),// user-overridden values
  branchSelection: z.string().optional(),   // selected Branch.id (for gates)
  lane: z.number().int().optional(),        // 1 or 2 for parallel lanes
  forkId: z.string().optional(),            // node id of the gate that forked
  laneIndex: z.number().int().optional(),
  notes: z.string().optional(),
});

export const PathwayNodeSchema = z.object({
  id: z.string(),                           // canvas-unique, e.g. "pe-001"
  type: z.string().default("pathwayNode"),  // React Flow custom node type key
  position: z.object({ x: z.number(), y: z.number() }),
  data: NodeDataSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional(),
  draggable: z.boolean().optional(),
});
export type PathwayNode = z.infer<typeof PathwayNodeSchema>;

/* ------------------------------------------------------------------ */
/* Edge — connection between two nodes                                 */
/* ------------------------------------------------------------------ */

export const EdgeKindSchema = z.enum([
  "sequential",       // default cyan
  "out_of_sequence",  // red marker
  "parallel",         // pink marker, used inside parallel lanes
  "handoff",          // partner/payer/family handoff edge
]);

export const PathwayEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().default("pathwayEdge"),
  data: z
    .object({
      kind: EdgeKindSchema.default("sequential"),
      branchId: z.string().optional(),      // FK to Branch.id when leaving a gate
      label: z.string().optional(),
    })
    .default({ kind: "sequential" }),
  animated: z.boolean().optional(),
});
export type PathwayEdge = z.infer<typeof PathwayEdgeSchema>;

/* ------------------------------------------------------------------ */
/* Catalog document — separate file, single source of truth            */
/* Lives at /catalog/catalog.json, versioned independently             */
/* ------------------------------------------------------------------ */

export const CatalogDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.string(),                // semver, e.g. "1.4.0"
  updatedAt: z.string(),                     // ISO
  blocks: z.array(BlockDefinitionSchema),
  branches: z.record(z.array(BranchSchema)), // keyed by source block id
});
export type CatalogDocument = z.infer<typeof CatalogDocumentSchema>;

/* ------------------------------------------------------------------ */
/* Document — what gets serialized to a .pathway.json file in the repo */
/* Catalog is referenced by id; the runtime resolves blockId against   */
/* the current catalog.json at load time.                              */
/* ------------------------------------------------------------------ */

export const GeographySchema = z.enum([
  "national",
  "southeast",
  "northeast",
  "midwest",
  "west",
]);

export const PathwayMetaSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),                           // slug, e.g. "partner-cognitive-journey"
  title: z.string(),
  description: z.string().optional(),
  geography: GeographySchema.default("national"),
  template: z.string().optional(),         // cognitive | diabetes | cv | partner_journey | empty | custom
  createdAt: z.string(),                   // ISO
  updatedAt: z.string(),                   // ISO
  authors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  // Catalog the doc was authored against. The loader compares this to the
  // current catalogVersion and surfaces drift (missing blocks, breaking
  // paramSchema changes) before render. Pathway is still openable when drift
  // is present — missing blocks render as `MissingBlockNode` placeholders.
  catalogVersion: z.string(),
});

export const PathwayDocumentSchema = z.object({
  meta: PathwayMetaSchema,
  graph: z.object({
    nodes: z.array(PathwayNodeSchema),
    edges: z.array(PathwayEdgeSchema),
    viewport: z
      .object({ x: z.number(), y: z.number(), zoom: z.number() })
      .optional(),
  }),
});
export type PathwayDocument = z.infer<typeof PathwayDocumentSchema>;

/* ------------------------------------------------------------------ */
/* Drift detection — used by deserialize.ts and the CI validator       */
/* ------------------------------------------------------------------ */

export interface CatalogDriftReport {
  authoredAgainst: string;        // doc.meta.catalogVersion
  currentVersion: string;         // catalog.catalogVersion
  missingBlockIds: string[];      // referenced by nodes but absent from catalog
  missingBranchIds: Array<{ nodeId: string; branchId: string }>;
  paramSchemaChanges: Array<{    // node params that no longer match catalog paramSchema
    nodeId: string;
    blockId: string;
    droppedKeys: string[];
    typeChangedKeys: string[];
  }>;
}

export function detectCatalogDrift(
  doc: PathwayDocument,
  catalog: CatalogDocument
): CatalogDriftReport {
  const blockMap = new Map(catalog.blocks.map((b) => [b.id, b]));
  const missingBlockIds: string[] = [];
  const missingBranchIds: CatalogDriftReport["missingBranchIds"] = [];
  const paramSchemaChanges: CatalogDriftReport["paramSchemaChanges"] = [];

  for (const node of doc.graph.nodes) {
    const def = blockMap.get(node.data.blockId);
    if (!def) {
      missingBlockIds.push(node.data.blockId);
      continue;
    }
    if (node.data.branchSelection) {
      const branches = catalog.branches[def.id] ?? [];
      if (!branches.some((br) => br.id === node.data.branchSelection)) {
        missingBranchIds.push({
          nodeId: node.id,
          branchId: node.data.branchSelection,
        });
      }
    }
    const validKeys = new Set(def.paramSchema.map((p) => p.key));
    const droppedKeys = Object.keys(node.data.params).filter(
      (k) => !validKeys.has(k)
    );
    if (droppedKeys.length > 0) {
      paramSchemaChanges.push({
        nodeId: node.id,
        blockId: def.id,
        droppedKeys,
        typeChangedKeys: [], // deeper check is done in deserialize.ts
      });
    }
  }

  return {
    authoredAgainst: doc.meta.catalogVersion,
    currentVersion: catalog.catalogVersion,
    missingBlockIds: [...new Set(missingBlockIds)],
    missingBranchIds,
    paramSchemaChanges,
  };
}

/* ------------------------------------------------------------------ */
/* Computed metrics — derived, never serialized                        */
/* ------------------------------------------------------------------ */

export interface PathwayMetrics {
  cost: number;
  risk: number;       // % risk reduction, capped at 95
  savings: number;    // risk * $450
  roi: number;        // (savings - cost) / cost * 100
  score: number;      // min(100, risk * 1.05)
}

/* ------------------------------------------------------------------ */
/* Helpers — every worktree imports these to stay aligned              */
/* ------------------------------------------------------------------ */

export const CURRENT_SCHEMA_VERSION = 1 as const;

/* ------------------------------------------------------------------ */
/* Fuzzy matching — suggests catalog blocks for orphaned blockIds      */
/* Used by MissingBlockNode's "Replace…" picker and by migrate --dry   */
/* ------------------------------------------------------------------ */

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

export interface BlockMatch {
  blockId: string;
  label: string;
  type: BlockType;
  distance: number;     // 0 = identical, lower = closer
  confidence: number;   // 0–1, normalized against query length
  reason: "exact" | "substring" | "prefix" | "fuzzy" | "type-fallback";
}

export function findClosestBlockMatches(
  missingId: string,
  catalog: CatalogDocument,
  options: { limit?: number; minConfidence?: number; preferType?: BlockType } = {}
): BlockMatch[] {
  const { limit = 5, minConfidence = 0.4, preferType } = options;
  const query = missingId.toLowerCase();

  const matches: BlockMatch[] = catalog.blocks.map((b) => {
    const id = b.id.toLowerCase();
    let distance: number;
    let reason: BlockMatch["reason"];

    if (id === query) {
      distance = 0;
      reason = "exact";
    } else if (id.startsWith(query) || query.startsWith(id)) {
      distance = Math.abs(id.length - query.length);
      reason = "prefix";
    } else if (id.includes(query) || query.includes(id)) {
      distance = Math.abs(id.length - query.length) + 1;
      reason = "substring";
    } else {
      distance = levenshtein(id, query);
      reason = "fuzzy";
    }

    const maxLen = Math.max(id.length, query.length, 1);
    let confidence = 1 - distance / maxLen;

    if (preferType && b.type === preferType) confidence += 0.05;

    return { blockId: b.id, label: b.label, type: b.type, distance, confidence, reason };
  });

  return matches
    .filter((m) => m.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence || a.distance - b.distance)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */

export function makeEmptyPathway(
  id: string,
  title: string,
  catalogVersion: string
): PathwayDocument {
  const now = new Date().toISOString();
  return {
    meta: {
      schemaVersion: 1,
      id,
      title,
      geography: "national",
      template: "empty",
      createdAt: now,
      updatedAt: now,
      authors: [],
      tags: [],
      catalogVersion,
    },
    graph: { nodes: [], edges: [] },
  };
}
