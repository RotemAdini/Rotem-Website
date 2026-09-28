export function entitlementRowsAllowAccess(rows: readonly { revoked_at: string | null }[]): boolean {
  return rows.some((row) => row.revoked_at === null);
}
