/**
 * Script to reconcile stale pending transfers whose on-chain receipts show success.
 * Run with: node_modules/.bin/tsx scripts/fix-stale-pending.ts
 */
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { db } from "../lib/db/client";
import { transfers } from "../lib/db/schema";
import { eq, inArray } from "drizzle-orm";

const rpcUrl =
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` ||
  "https://rpc.sepolia.org";

const client = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

async function main() {
  // Fetch all pending transfers
  const pending = await db
    .select()
    .from(transfers)
    .where(eq(transfers.status, "pending"));

  console.log(`Found ${pending.length} pending transfer(s).`);

  for (const tx of pending) {
    if (!tx.transactionHash) {
      console.log(`  [${tx.id}] No transactionHash — cannot verify on-chain.`);
      // These records were created without being broadcast; mark unknown
      await db
        .update(transfers)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(transfers.id, tx.id));
      console.log(`  [${tx.id}] Marked FAILED (never broadcast).`);
      continue;
    }

    console.log(`  [${tx.id}] Checking tx ${tx.transactionHash}...`);
    try {
      const receipt = await client.getTransactionReceipt({
        hash: tx.transactionHash as `0x${string}`,
      });

      if (receipt.status === "success") {
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
          .where(eq(transfers.id, tx.id));
        console.log(`  [${tx.id}] ✅ Marked CONFIRMED (block ${receipt.blockNumber}).`);
      } else if (receipt.status === "reverted") {
        await db
          .update(transfers)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(transfers.id, tx.id));
        console.log(`  [${tx.id}] ❌ Marked FAILED (reverted on-chain).`);
      } else {
        console.log(`  [${tx.id}] Unknown receipt status: ${receipt.status}`);
      }
    } catch (err: any) {
      if (err?.message?.includes("Transaction receipt with hash") || err?.message?.includes("not found")) {
        console.log(`  [${tx.id}] No receipt found (may be dropped/not mined). Keeping pending.`);
      } else {
        console.log(`  [${tx.id}] RPC error: ${err?.message}. Keeping pending.`);
      }
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
