import { LedgerEntry } from "./types";

const fallbackId = () =>
  `ledger_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function createLedgerEntry(
  base: Omit<LedgerEntry, "id">,
): LedgerEntry {
  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : fallbackId();
  return { ...base, id };
}
