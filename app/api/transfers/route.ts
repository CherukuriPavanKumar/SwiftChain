import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transfers } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import {
  canTransition,
  getAllowedTransitions,
  TERMINAL_STATUSES,
  type TransferStatus,
} from "@/lib/transfer-state";

// ---------------------------------------------------------------------------
// Per-user in-memory rate limiter (Milestone 14)
// Limits: 20 POST requests per user per 60-second window.
// For production, replace with Redis or Vercel KV.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: session } = await auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// All valid transfer statuses (Milestone 3 — includes 'rejected')
// ---------------------------------------------------------------------------

const TRANSFER_STATUS_ENUM = [
  "draft",
  "awaiting signature",
  "pending",
  "confirmed",
  "failed",
  "rejected",
] as const;

// ---------------------------------------------------------------------------
// Validation schemas (Milestone 14 — Zod with full status enum)
// ---------------------------------------------------------------------------

const createTransferSchema = z.object({
  senderAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid sender Ethereum address"),
  recipientAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient Ethereum address"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  chainId: z.coerce.number().int().positive("Chain ID must be a valid positive integer"),
  assetSymbol: z.string().default("ETH"),
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token contract address")
    .optional()
    .nullable(),
  inrSourceAmount: z.string().optional().nullable(),
  referenceRate: z.string().optional().nullable(),
  estimatedDestinationUsd: z.string().optional().nullable(),
  networkFeeEth: z.string().optional().nullable(),
  platformFeeInr: z.string().optional().nullable(),
  status: z.enum(TRANSFER_STATUS_ENUM).default("draft"),
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash")
    .optional()
    .nullable(),
  isSimulatedPayout: z.boolean().optional().default(false),
  payoutStatus: z.string().optional().default("none"),
  payoutCompletedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  confirmedAt: z.coerce.date().optional().nullable(),
});

const updateTransferSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    transactionHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash")
      .optional(),
    status: z.enum(TRANSFER_STATUS_ENUM).optional(),
    isSimulatedPayout: z.boolean().optional(),
    payoutStatus: z.string().optional(),
    payoutCompletedAt: z.coerce.date().optional().nullable(),
    confirmedAt: z.coerce.date().optional().nullable(),
  })
  .refine((data) => data.id !== undefined || data.transactionHash !== undefined, {
    message: "Either id or transactionHash must be provided",
  });

// ---------------------------------------------------------------------------
// POST /api/transfers — Create a new transfer (requires auth + rate limit)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to record transfers." },
      { status: 401 }
    );
  }

  // Rate limit per authenticated user (Milestone 14)
  if (isRateLimited(`post:${userId}`)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before submitting another transfer." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = createTransferSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // --- Idempotency: if a tx hash is provided, upsert rather than duplicate (Milestone 13)
    if (data.transactionHash) {
      const existing = await withRetry(() =>
        db
          .select({ id: transfers.id })
          .from(transfers)
          .where(
            and(
              eq(transfers.transactionHash, data.transactionHash!),
              or(eq(transfers.userId, userId), isNull(transfers.userId))
            )
          )
          .limit(1)
      );

      if (existing.length > 0) {
        // Row already exists for this tx hash — return it without creating a duplicate
        const row = await withRetry(() =>
          db.select().from(transfers).where(eq(transfers.id, existing[0].id)).limit(1)
        );
        return NextResponse.json(row[0], { status: 200 });
      }
    }

    const result = await withRetry(() =>
      db
        .insert(transfers)
        .values({
          userId,
          senderAddress: data.senderAddress,
          recipientAddress: data.recipientAddress,
          amount: data.amount,
          chainId: data.chainId,
          assetSymbol: data.assetSymbol,
          tokenAddress: data.tokenAddress ?? null,
          inrSourceAmount: data.inrSourceAmount ?? null,
          referenceRate: data.referenceRate ?? null,
          estimatedDestinationUsd: data.estimatedDestinationUsd ?? null,
          networkFeeEth: data.networkFeeEth ?? null,
          platformFeeInr: data.platformFeeInr ?? null,
          status: data.status,
          transactionHash: data.transactionHash ?? null,
          isSimulatedPayout: data.isSimulatedPayout,
          payoutStatus: data.payoutStatus,
          payoutCompletedAt: data.payoutCompletedAt ?? null,
          createdAt: data.createdAt,
          confirmedAt: data.confirmedAt ?? null,
        })
        .returning()
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to create transfer:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/transfers — Fetch only the signed-in user's transfers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || searchParams.get('address');

  try {
    const result = await withRetry(() => {
      if (userId) {
        return db
          .select()
          .from(transfers)
          .where(eq(transfers.userId, userId))
          .orderBy(desc(transfers.createdAt));
      }

      if (wallet) {
        return db
          .select()
          .from(transfers)
          .where(
            or(
              sql`lower(${transfers.senderAddress}) = lower(${wallet})`,
              sql`lower(${transfers.recipientAddress}) = lower(${wallet})`
            )
          )
          .orderBy(desc(transfers.createdAt));
      }

      // Unauthenticated visit with no connected wallet has no transactions
      return [];
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Failed to fetch transfers:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/transfers — Update transfer (ownership + state machine guard)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  // Rate limit PATCH separately (Milestone 14)
  if (isRateLimited(`patch:${userId}`)) {
    return NextResponse.json(
      { error: "Too many requests. Slow down." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = updateTransferSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { id, transactionHash, status: newStatus, ...updates } = parseResult.data;

    // Build lookup condition
    const lookupCondition =
      id !== undefined
        ? eq(transfers.id, id)
        : eq(transfers.transactionHash, transactionHash!);

    const ownershipCondition = or(eq(transfers.userId, userId), isNull(transfers.userId));

    // Fetch the current row to enforce state machine transitions (Milestone 3)
    const current = await withRetry(() =>
      db
        .select({ id: transfers.id, status: transfers.status })
        .from(transfers)
        .where(and(lookupCondition, ownershipCondition))
        .limit(1)
    );

    if (current.length === 0) {
      return NextResponse.json(
        { error: "Transfer not found or access denied" },
        { status: 404 }
      );
    }

    const currentStatus = current[0].status as TransferStatus;

    // Enforce state machine (Milestone 3)
    if (newStatus && newStatus !== currentStatus) {
      if (TERMINAL_STATUSES.has(currentStatus)) {
        return NextResponse.json(
          {
            error: `Transfer is already in terminal state '${currentStatus}' and cannot be updated.`,
            currentStatus,
            requestedStatus: newStatus,
          },
          { status: 409 }
        );
      }

      if (!canTransition(currentStatus, newStatus as TransferStatus)) {
        return NextResponse.json(
          {
            error: `Invalid state transition: '${currentStatus}' → '${newStatus}'.`,
            currentStatus,
            requestedStatus: newStatus,
            allowedTransitions: getAllowedTransitions(currentStatus),
          },
          { status: 422 }
        );
      }
    }

    const result = await withRetry(() =>
      db
        .update(transfers)
        .set({
          ...updates,
          ...(newStatus ? { status: newStatus } : {}),
          userId, // claim orphan legacy rows on first update
          updatedAt: sql`now()`,
        })
        .where(and(lookupCondition, ownershipCondition))
        .returning()
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Transfer not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err: unknown) {
    console.error("Failed to update transfer:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}