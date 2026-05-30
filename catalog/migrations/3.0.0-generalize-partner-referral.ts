import type { Migration } from "../../bin/migrate";

// v2.0.0 → v3.0.0: generalize the entry referral block so the catalog isn't tied
// to a specific partner. Renames the `agilon_referral` block id to the generic
// `partner_referral`. Any v2.0.0 pathway that referenced the old id is rewritten
// to the new id on `pnpm migrate`.
export const migration: Migration = {
  fromCatalogVersion: "2.x.x",
  toCatalogVersion: "3.0.0",
  description: "Rename agilon_referral → partner_referral (generalize partner)",
  blockIdRenames: { agilon_referral: "partner_referral" },
};
