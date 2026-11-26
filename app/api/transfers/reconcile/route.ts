/**
 * POST /api/transfers/reconcile
 *
 * Server-side reconciliation for stale pending transfers.
 *
 * Fetches all `pending` transfers owned by the authenticated user,
 * checks their on-chain receipt via Alchemy, and updates the DB to
 * the correct terminal state (confirmed / failed).
 *
 * Idempotent — safe to call multiple times. Skips rows with no txHash.
 * Limited to 20 stale checks per request to bound RPC usage.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient, http, fallback } from "viem";
import { sepolia } from "viem/chains";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { transfers } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { canTransition, TERMINAL_STATUSES } from "@/lib/transfer-state";
import type { TransferStatus } from "@/lib/transfer-state";

// ---------------------------------------------------------------------------
// Server-side Sepolia public client (uses NEXT_PUBLIC_ALCHEMY_API_KEY which
// is exposed both server- and client-side per Next.js convention)
// ---------------------------------------------------------------------------

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

const serverClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    ...(alchemyKey ? [http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`)] : []),
    http("https://gateway.tenderly.co/public/sepolia"),
    http("https://11155111.rpc.thirdweb.com"),
    http(), // wagmi default
  ]),
});

const MAX_CHECKS_PER_REQUEST = 20;

// ---------------------------------------------------------------------------
// POST /api/transfers/reconcile
// ---------------------------------------------------------------------------

export async function POST(_request: NextRequest) {
  // Auth guard
  let userId: string | null = null;
  try {
    const { data: session } = await auth.getSession();
    userId = session?.user?.id ?? null;
  } catch {
    /* ignore */
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch pending transfers owned by this user (or unclaimed legacy rows)
  const ownershipCondition = or(
    eq(transfers.userId, userId),
    isNull(transfers.userId)
  );

  const pending = await db
    .select({
      id: transfers.id,
      status: transfers.status,
      transactionHash: transfers.transactionHash,
    })
    .from(transfers)
    .where(and(eq(transfers.status, "pending"), ownershipCondition))
    .limit(MAX_CHECKS_PER_REQUEST);

  const results: {
    id: number;
    prevStatus: string;
    newStatus: string | null;
    reason: string;
  }[] = [];

  for (const tx of pending) {
    // Skip rows that were never broadcast
    if (!tx.transactionHash) {
      results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: "no_hash" });
      continue;
    }

    // Guard: skip rows already in a terminal state (shouldn't happen with filter, but be safe)
    if (TERMINAL_STATUSES.has(tx.status as TransferStatus)) {
      results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: "already_terminal" });
      continue;
    }

    try {
      const receipt = await serverClient.getTransactionReceipt({
        hash: tx.transactionHash as `0x${string}`,
      });

      if (receipt.status === "success") {
        if (!canTransition(tx.status as TransferStatus, "confirmed")) {
          results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: "invalid_transition" });
          continue;
        }
        const confirmedAt = new Date();
        await db
          .update(transfers)
          .set({
            status: "confirmed",
            confirmedAt,
            payoutStatus: "simulated_completed",
            payoutCompletedAt: confirmedAt,
            updatedAt: confirmedAt,
          })
          .where(and(eq(transfers.id, tx.id), ownershipCondition));
        results.push({ id: tx.id, prevStatus: tx.status, newStatus: "confirmed", reason: "receipt_success" });
      } else if (receipt.status === "reverted") {
        await db
          .update(transfers)
          .set({ status: "failed", updatedAt: new Date() })
          .where(and(eq(transfers.id, tx.id), ownershipCondition));
        results.push({ id: tx.id, prevStatus: tx.status, newStatus: "failed", reason: "receipt_reverted" });
      } else {
        results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: "receipt_unknown_status" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      // Not found = not yet mined or dropped — leave pending
      if (msg.includes("not found") || msg.includes("Transaction receipt with hash")) {
        results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: "not_mined_yet" });
      } else {
        results.push({ id: tx.id, prevStatus: tx.status, newStatus: null, reason: `rpc_error: ${msg.slice(0, 80)}` });
      }
    }
  }

  const changed = results.filter((r) => r.newStatus !== null).length;
  return NextResponse.json({ reconciled: changed, total: pending.length, results });
}

