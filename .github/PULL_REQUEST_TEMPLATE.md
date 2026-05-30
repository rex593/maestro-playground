# Summary

<!-- What changed and why, in 1–3 sentences. -->

## Scope of change

- [ ] App code only (no catalog or schema edits)
- [ ] Catalog edit (bumps `catalogVersion` in `catalog/catalog.ts`)
- [ ] Schema edit (changes `src/schema/pathway-schema.ts`)
- [ ] New pathway fixture under `examples/`

## Required checks before merge

- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm catalog:check` passes (TS source ↔ generated JSON in sync)
- [ ] `pnpm drift:report catalog/catalog.json` shows ✓ for every fixture
- [ ] If this is a **major** catalog bump: a migration file exists under `catalog/migrations/` AND `pnpm migrate:dry` is clean
- [ ] Screenshot or screen recording attached for any UI change

## Catalog impact (fill in only if catalog edited)

- New `catalogVersion`: <!-- e.g. 1.1.0 -->
- Semver tier: <!-- patch | minor | major -->
- Added blocks: <!-- ids or "none" -->
- Renamed/removed blocks: <!-- ids or "none" — REQUIRES migration -->
- Migration file: <!-- path or "n/a" -->
