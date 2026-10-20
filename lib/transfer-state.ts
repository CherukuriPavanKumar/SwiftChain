/**
 * Transfer State Machine — SwiftChain V2 (Milestone 3)
 *
 * Defines every valid status, the allowed transitions between them, and a
 * typed guard function that enforces those transitions server-side.
 *
 * State flow:
 *
 *   draft ──► awaiting signature ──► pending ──► confirmed
 *                │                      │              │
 *                └──► rejected           └──► failed   └──► (payout lifecycle)
 *
 * Rules:
 *  - Terminal states (confirmed, failed, rejected) cannot transition forward.
 *  - Backward transitions are never allowed.
 *  - confirmed may receive payout updates (payoutStatus only, not status).
 */

export const TRANSFER_STATUSES = [
  'draft',
  'awaiting signature',
  'pending',
  'confirmed',
  'failed',
  'rejected',
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

/** Terminal states — status column must not change once reached. */
export const TERMINAL_STATUSES = new Set<TransferStatus>([
  'confirmed',
  'failed',
  'rejected',
]);

/**
 * Allowed transitions map.
 * Key = current status → Value = set of statuses it may move to.
 */
const VALID_TRANSITIONS: Record<TransferStatus, ReadonlySet<TransferStatus>> = {
  draft:                 new Set(['awaiting signature', 'rejected']),
  'awaiting signature':  new Set(['pending', 'rejected']),
  pending:               new Set(['confirmed', 'failed']),
  confirmed:             new Set(),  // terminal — payout fields update separately
  failed:                new Set(),  // terminal
  rejected:              new Set(),  // terminal
};

/**
 * Checks whether transitioning from `from` → `to` is a valid state move.
 *
 * @returns true when the transition is allowed.
 */
export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * Returns an array of statuses that the given status is permitted to move to.
 */
export function getAllowedTransitions(from: TransferStatus): TransferStatus[] {
  return Array.from(VALID_TRANSITIONS[from] ?? []);
}

/**
 * Returns a user-readable description of a status.
 */
export function describeStatus(status: TransferStatus): string {
  const descriptions: Record<TransferStatus, string> = {
    draft:                'Transfer created, not yet submitted to wallet.',
    'awaiting signature': 'Waiting for the user to sign and approve in their wallet.',
    pending:              'Transaction submitted to the network; awaiting on-chain confirmation.',
    confirmed:            'Transaction confirmed on-chain. Destination payout in progress.',
    failed:               'Transaction failed or reverted on-chain.',
    rejected:             'User rejected the transaction in their wallet.',
  };
  return descriptions[status] ?? 'Unknown status.';
}
