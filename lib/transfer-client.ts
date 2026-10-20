/**
 * Transfer API Client — SwiftChain V2 (Milestone 11)
 *
 * Centralises all client-side HTTP calls to /api/transfers so that UI
 * components (SendTransaction, TransferReviewModal) never embed raw fetch()
 * calls. This is the single place to change base URLs, add auth headers,
 * or swap the underlying transport.
 */

import type { TransferRecord } from '@/app/transfer-history';

// ---------------------------------------------------------------------------
// Types mirrored from the API validation schema
// ---------------------------------------------------------------------------

export interface CreateTransferInput {
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  chainId: number;
  assetSymbol: string;
  tokenAddress?: string | null;
  inrSourceAmount?: string | null;
  referenceRate?: string | null;
  estimatedDestinationUsd?: string | null;
  networkFeeEth?: string | null;
  platformFeeInr?: string | null;
  status?: string;
  transactionHash?: string | null;
  isSimulatedPayout?: boolean;
  payoutStatus?: string;
  payoutCompletedAt?: string | null;
  createdAt?: string;
  confirmedAt?: string | null;
}

export interface UpdateTransferInput {
  id?: number;
  transactionHash?: string;
  status?: string;
  isSimulatedPayout?: boolean;
  payoutStatus?: string;
  payoutCompletedAt?: string | null;
  confirmedAt?: string | null;
}

// ---------------------------------------------------------------------------
// API client functions
// ---------------------------------------------------------------------------

export async function fetchTransfers(wallet?: string): Promise<TransferRecord[]> {
  const url = wallet ? `/api/transfers?wallet=${encodeURIComponent(wallet)}` : '/api/transfers';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load transfers: ${res.status}`);
  return res.json();
}

/**
 * Create a new pending transfer record in the database.
 * The server stamps the caller's userId automatically.
 * Returns the created record or throws on failure.
 */
export async function createTransfer(input: CreateTransferInput): Promise<TransferRecord> {
  const res = await fetch('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    throw new Error('You must be signed in to record a transfer. Your on-chain transaction still went through.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Failed to create transfer: ${res.status}`);
  }
  return res.json();
}

/**
 * Update the status, payout state, or confirmation details of an existing
 * transfer. Identified by either its database id or its transaction hash.
 * Returns the updated record or throws on failure.
 */
export async function updateTransfer(input: UpdateTransferInput): Promise<TransferRecord> {
  const res = await fetch('/api/transfers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    throw new Error('Unauthorized to update this transfer.');
  }
  if (res.status === 404) {
    throw new Error('Transfer not found or you do not have permission to update it.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Failed to update transfer: ${res.status}`);
  }
  return res.json();
}
