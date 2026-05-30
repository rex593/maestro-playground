// src/io/shareLink.ts
// Encode/decode a PathwayDocument into a URL hash fragment for "Copy share link".
// Uses encodeURIComponent before btoa so unicode survives the base64 round-trip.

import type { PathwayDocument } from "@/schema/pathway-schema";

const HASH_PREFIX = "#p=";

export function encodeShareHash(doc: PathwayDocument): string {
  return HASH_PREFIX + btoa(encodeURIComponent(JSON.stringify(doc)));
}

/** Returns the decoded payload from a location hash, or null if none/invalid. */
export function decodeShareHash(hash: string): unknown | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(hash.slice(HASH_PREFIX.length))));
  } catch {
    return null;
  }
}
