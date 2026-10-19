import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transfers } from "@/lib/db/schema";

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
  status: z
    .enum(["draft", "awaiting signature", "pending", "confirmed", "failed"])
    .default("draft"),
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash")
    .optional()
    .nullable(),
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
    status: z
      .enum(["draft", "awaiting signature", "pending", "confirmed", "failed"])
      .optional(),
    confirmedAt: z.coerce.date().optional().nullable(),
  })
  .refine((data) => data.id !== undefined || data.transactionHash !== undefined, {
    message: "Either id or transactionHash must be provided",
  });

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

export async function POST(request: Request) {
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

    const result = await withRetry(() =>
      db
        .insert(transfers)
        .values({
          senderAddress: data.senderAddress,
          recipientAddress: data.recipientAddress,
          amount: data.amount,
          chainId: data.chainId,
          assetSymbol: data.assetSymbol,
          status: data.status,
          transactionHash: data.transactionHash ?? null,
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

export async function GET() {
  try {
    const result = await withRetry(() =>
      db
        .select()
        .from(transfers)
        .orderBy(desc(transfers.createdAt))
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Failed to fetch transfers:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const rawBody = await request.json();
    const parseResult = updateTransferSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { id, transactionHash, ...updates } = parseResult.data;

    const condition =
      id !== undefined
        ? eq(transfers.id, id)
        : eq(transfers.transactionHash, transactionHash!);

    const result = await withRetry(() =>
      db
        .update(transfers)
        .set(updates)
        .where(condition)
        .returning()
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err: unknown) {
    console.error("Failed to update transfer:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}