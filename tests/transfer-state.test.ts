import { describe, it, expect } from "vitest";
import {
  TRANSFER_STATUSES,
  TERMINAL_STATUSES,
  canTransition,
  getAllowedTransitions,
  describeStatus,
  type TransferStatus,
} from "../lib/transfer-state";

describe("Transfer State Machine (lib/transfer-state)", () => {
  it("defines the expected complete set of statuses", () => {
    expect(TRANSFER_STATUSES).toEqual([
      "draft",
      "awaiting signature",
      "pending",
      "confirmed",
      "failed",
      "rejected",
    ]);
  });

  it("marks confirmed, failed, and rejected as terminal statuses", () => {
    expect(TERMINAL_STATUSES.has("confirmed")).toBe(true);
    expect(TERMINAL_STATUSES.has("failed")).toBe(true);
    expect(TERMINAL_STATUSES.has("rejected")).toBe(true);
    expect(TERMINAL_STATUSES.has("pending")).toBe(false);
    expect(TERMINAL_STATUSES.has("draft")).toBe(false);
  });

  it("permits valid forward transitions", () => {
    expect(canTransition("draft", "awaiting signature")).toBe(true);
    expect(canTransition("draft", "rejected")).toBe(true);
    expect(canTransition("awaiting signature", "pending")).toBe(true);
    expect(canTransition("awaiting signature", "rejected")).toBe(true);
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "failed")).toBe(true);
  });

  it("blocks invalid transitions and backward moves", () => {
    expect(canTransition("pending", "draft")).toBe(false);
    expect(canTransition("pending", "awaiting signature")).toBe(false);
    expect(canTransition("draft", "confirmed")).toBe(false);
    expect(canTransition("awaiting signature", "confirmed")).toBe(false);
  });

  it("blocks any transition out of terminal states", () => {
    const terminals: TransferStatus[] = ["confirmed", "failed", "rejected"];
    for (const term of terminals) {
      for (const target of TRANSFER_STATUSES) {
        expect(canTransition(term, target)).toBe(false);
      }
      expect(getAllowedTransitions(term)).toEqual([]);
    }
  });

  it("returns allowed transitions correctly", () => {
    expect(getAllowedTransitions("draft")).toEqual(["awaiting signature", "rejected"]);
    expect(getAllowedTransitions("awaiting signature")).toEqual(["pending", "rejected"]);
    expect(getAllowedTransitions("pending")).toEqual(["confirmed", "failed"]);
  });

  it("provides meaningful human descriptions for each status", () => {
    for (const status of TRANSFER_STATUSES) {
      const desc = describeStatus(status);
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(5);
    }
  });
});
