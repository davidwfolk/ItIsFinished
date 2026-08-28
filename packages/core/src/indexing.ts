import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Generate an order_index string between two existing items.
 *
 * @param prev - order_index of preceding item (null if inserting at start)
 * @param next - order_index of succeeding item (null if inserting at end)
 * @returns Lexicographically sortable string (e.g., 'a0', 'a0V', 'a1')
 */
export function getOrderIndexBetween(prev: string | null | undefined, next: string | null | undefined): string {
  return generateKeyBetween(prev ?? null, next ?? null);
}

/**
 * Generate N evenly spaced order_index keys between two items.
 * Useful for bulk importing or initial list creation.
 */
export function getBatchOrderIndices(
  prev: string | null | undefined,
  next: string | null | undefined,
  count: number
): string[] {
  return generateNKeysBetween(prev ?? null, next ?? null, count);
}

/**
 * Default starting index for the first item in a new list.
 */
export const DEFAULT_INITIAL_INDEX = 'a0';
