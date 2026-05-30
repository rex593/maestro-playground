// catalog/catalog.ts
// Source of truth for the block catalog. Authored in TypeScript so block
// authors get IntelliSense, exhaustive enum checks, and compile-time errors
// before any CI runs. `pnpm catalog:build` validates this file with
// CatalogDocumentSchema and emits the matching catalog/catalog.json that the
// app + CI consume.
//
// Editing rules:
//   1. Never remove or rename a `block.id` without bumping the catalogVersion
//      major and writing a migration in catalog/migrations/.
//   2. Adding new blocks is a patch bump. Adding paramSchema keys is a minor.
//   3. Sort blocks alphabetically inside each type group — git diffs stay small.
//
// This file is read-only outside of catalog-edit PRs (see CODEOWNERS).

import type {
  CatalogDocument,
  BlockDefinition,
  Branch,
} from "../src/schema/pathway-schema";

const CATALOG_VERSION = "1.0.0";

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const ENTRY: BlockDefinition[] = [
  {
    id: "entry_block",
    type: "entry",
    label: "Entry Block",
    shortLabel: "Entry",
    isEntryHub: true,
    description: "Top-of-funnel hub. Branches to entry routes.",
    costPerPatient: 0,
    riskReduction: 0,
    paramSchema: [],
    defaultParams: {},
  },
  {
    id: "entry_awv",
    type: "entry",
    label: "Annual Wellness Visit",
    shortLabel: "AWV",
    isEntryRoute: true,
    cpt: "G0438",
    costPerPatient: 175,
    riskReduction: 2,
    paramSchema: [],
    defaultParams: {},
  },
  // … port the rest of the prototype's entry blocks here
];

const ASSESSMENT: BlockDefinition[] = [
  {
    id: "moca",
    type: "assessment",
    label: "MoCA (Montreal Cognitive Assessment)",
    shortLabel: "MoCA",
    description: "30-point cognitive screen administered at intake.",
    costPerPatient: 45,
    evidenceGrade: "A",
    riskReduction: 4,
    cpt: "96132",
    paramSchema: [
      {
        kind: "number",
        key: "cutoffScore",
        label: "Cutoff score",
        defaultValue: 26,
        min: 18,
        max: 30,
        step: 1,
      },
      {
        kind: "select",
        key: "administeredBy",
        label: "Administered by",
        defaultValue: "trained_staff",
        options: [
          { value: "trained_staff", label: "Trained staff" },
          { value: "physician", label: "Physician" },
          { value: "neuropsych", label: "Neuropsychologist" },
        ],
      },
    ],
    defaultParams: { cutoffScore: 26, administeredBy: "trained_staff" },
  },
  // … port the rest
];

const DECISION: BlockDefinition[] = [
  {
    id: "junction_partner_handoff",
    type: "decision",
    label: "Partner Owns Next Step",
    shortLabel: "Partner Handoff",
    description:
      "Full handoff to partner after assessment. Partner controls workup, treatment, and follow-up.",
    isGate: true,
    whoDecides: "Partner",
    costPerPatient: 0,
    riskReduction: 0,
    paramSchema: [
      {
        kind: "select",
        key: "handoffPayload",
        label: "Handoff payload",
        defaultValue: "summary_plus_biomarkers",
        options: [
          { value: "summary_only", label: "Summary only" },
          { value: "summary_plus_biomarkers", label: "Summary + biomarkers" },
          { value: "full_protocol", label: "Full Mindspan protocol" },
        ],
      },
    ],
    defaultParams: { handoffPayload: "summary_plus_biomarkers" },
  },
  // … port the rest of the gates
];

const TREATMENT: BlockDefinition[] = [
  /* … */
];

const MONITORING: BlockDefinition[] = [
  /* … */
];

const OUTCOME: BlockDefinition[] = [
  /* … */
];

/* ------------------------------------------------------------------ */
/* Branches — keyed by source block id                                 */
/* ------------------------------------------------------------------ */

const BRANCHES: Record<string, Branch[]> = {
  junction_partner_handoff: [
    {
      id: "partner_full_control",
      label: "Partner takes full control",
      whoDecides: "Partner",
      effect: 1.0,
      isDefault: true,
      note: 'Mirza: "they may just want to buy the assessments and have control over the subsequent steps"',
    },
    {
      id: "shared_oversight",
      label: "Shared oversight with Mindspan",
      whoDecides: "Partner",
      effect: 1.1,
    },
  ],
  amyloid_status: [
    {
      id: "amyloid_positive",
      label: "Amyloid positive → PET confirmation",
      whoDecides: "Auto",
      effect: 1.0,
      isDefault: true,
    },
    {
      id: "amyloid_negative",
      label: "Amyloid negative → monitoring",
      whoDecides: "Auto",
      effect: 0.6,
    },
  ],
  // … port the rest
};

/* ------------------------------------------------------------------ */
/* Export — runtime validates this on import via catalog:build         */
/* ------------------------------------------------------------------ */

export const catalog: CatalogDocument = {
  schemaVersion: 1,
  catalogVersion: CATALOG_VERSION,
  updatedAt: new Date().toISOString(),
  blocks: [...ENTRY, ...ASSESSMENT, ...DECISION, ...TREATMENT, ...MONITORING, ...OUTCOME],
  branches: BRANCHES,
};

export default catalog;
