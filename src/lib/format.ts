/**
 * pt-BR formatting helpers — ported from the scattered `.toLocaleDateString("pt-BR")`
 * calls across the original frontend.
 */

export const formatDate = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString("pt-BR");

/** Format a date range as "dd/mm/yyyy - dd/mm/yyyy". */
export const formatDateRange = (startIso: string | Date, endIso: string | Date): string =>
  `${formatDate(startIso)} - ${formatDate(endIso)}`;

/** Zero-pad a batch number to 3 digits, e.g. 7 -> "007". */
export const padBatchNumber = (n: number): string => `${n}`.padStart(3, "0");

/** Format a batch number with leading hash, e.g. 7 -> "#007". */
export const formatBatchNumber = (n: number): string => `#${padBatchNumber(n)}`;

export const formatNumber = (n: number): string => n.toLocaleString("pt-BR");

/**
 * Force a date to "stick" to the chosen day by setting hours to 28 (next day 04:00).
 *
 * This is the exact behavior the original app used to avoid timezone rollback
 * making a date jump back a day. It's carried over for the port and flagged in
 * PAGES_EXTRACTION.md §10 #7 to be replaced with a real date-only model later.
 */
export const forceDateDay = (iso: string | Date): Date => {
  const d = new Date(iso);
  d.setHours(28);
  return d;
};
