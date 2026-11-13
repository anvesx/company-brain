import { VaultError } from "../errors.js";
import type { NewRow, Vault } from "../store/vault.js";

export type Legacy = NewRow & { tenant: string };
export type Report = { seen: number; alreadyThere: number; written: number; dryRun: boolean };

/**
 * Copies existing credentials (already decrypted by the caller from the old stack) into the vault.
 * `dryRun` writes nothing and reports how many rows are new. A real run re-counts the ids afterwards and throws COUNT_MISMATCH if any is missing.
 * Rows already in the vault are left alone, so the run can be repeated.
 */
export async function importRecords(vault: Vault, records: Legacy[], dryRun = false): Promise<Report> {
  const ids = records.map((r) => r.id);
  const alreadyThere = await vault.countIds(ids);
  const report: Report = { seen: ids.length, alreadyThere, written: 0, dryRun };
  if (dryRun) return { ...report, written: ids.length - alreadyThere };
  for (const r of records) {
    if (await vault.get(r.tenant, r.id)) continue;
    const { tenant, ...row } = r;
    await vault.put(tenant, row);
    report.written++;
  }
  const now = await vault.countIds(ids);
  if (now !== new Set(ids).size) throw new VaultError("COUNT_MISMATCH", `expected ${new Set(ids).size} rows in the vault, found ${now}`);
  return report;
}
