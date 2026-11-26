import { describe, it, expect } from "vitest";
import {
  formatINR,
  formatUSD,
  formatApproxFiat,
  formatTokenAmount,
  formatTokenBalance,
  formatGasFeeEth,
  formatPercentage,
  truncateAddress,
  truncateHash,
  formatDateTimeParts,
} from "../lib/format";

describe("Financial & Display Formatting (lib/format)", () => {
  it("formats INR with Indian locale grouping and proper currency symbol", () => {
    expect(formatINR(5000)).toBe("₹5,000.00");
    expect(formatINR(156346.5)).toBe("₹1,56,346.50");
    expect(formatINR(-0)).toBe("₹0.00");
    expect(formatINR(null)).toBe("Unavailable");
    expect(formatINR(NaN)).toBe("Unavailable");
  });

  it("formats USD properly", () => {
    expect(formatUSD(52.7)).toBe("$52.70");
    expect(formatUSD(1000000)).toBe("$1,000,000.00");
    expect(formatUSD(undefined)).toBe("Unavailable");
  });

  it("formats approximate values using genuine Unicode characters (no literal escapes)", () => {
    const label = formatApproxFiat(17839.08, "INR");
    expect(label).toBe("≈ ₹17,839.08");
    expect(label).not.toContain("\\u");
    expect(formatApproxFiat(null, "INR")).toBe("Rate unavailable");
  });

  it("formats gas fees without collapsing small nonzero values to 0.000000 ETH", () => {
    // 21,000 gas * 0.001 gwei = 21,000,000,000 wei = 0.000000021 ETH
    const tinyFee = formatGasFeeEth(BigInt(21_000) * BigInt(1_000_000), "wei");
    expect(tinyFee.status).toBe("ok");
    expect(tinyFee.formatted).toBe("0.000000021 ETH");
    expect(tinyFee.formatted).not.toBe("0.000000 ETH");
    expect(tinyFee.formatted).not.toContain("e-");

    // 21,000 gas * 1.5 gwei = 31,500,000,000,000 wei = 0.0000315 ETH
    const normalFee = formatGasFeeEth(BigInt(21_000) * BigInt(1_500_000_000), "wei");
    expect(normalFee.status).toBe("ok");
    expect(normalFee.formatted).toBe("0.0000315 ETH");

    // 65,000 gas * 1.5 gwei = 0.0000975 ETH
    const erc20Fee = formatGasFeeEth(BigInt(65_000) * BigInt(1_500_000_000), "wei");
    expect(erc20Fee.formatted).toBe("0.0000975 ETH");

    // Large gas fee (>= 0.001 ETH)
    const largeFee = formatGasFeeEth(BigInt("2500000000000000"), "wei");
    expect(largeFee.formatted).toBe("0.0025 ETH");

    // Exact zero vs unavailable
    expect(formatGasFeeEth(BigInt(0), "wei")).toEqual({
      formatted: "0 ETH",
      status: "zero",
      numericEth: 0,
    });
    expect(formatGasFeeEth(null, "wei")).toEqual({
      formatted: "Unavailable",
      status: "unavailable",
      numericEth: null,
    });
    expect(formatGasFeeEth("0.000000021", "eth").formatted).toBe("0.000000021 ETH");
  });

  it("preserves token-specific decimals and handles dust amounts", () => {
    expect(formatTokenBalance(BigInt("114100000000000000"), 18, "ETH")).toBe("0.1141 ETH");
    expect(formatTokenBalance(BigInt("12345678"), 6, "USDC")).toBe("12.35 USDC");
    expect(formatTokenBalance(BigInt("500"), 6, "USDC")).toBe("0.0005 USDC");
    expect(formatTokenBalance(BigInt("5000000000000"), 18, "ETH")).toBe("0.000005 ETH");
    expect(formatTokenAmount(52.7, "USDC")).toBe("52.70 USDC");
    expect(formatTokenAmount(0.021739, "ETH")).toBe("0.021739 ETH");
    expect(formatTokenAmount(0.00000025, "ETH")).toBe("0.00000025 ETH");
  });

  it("formats addresses, hashes, percentages, and timestamps cleanly", () => {
    expect(truncateAddress("0x30606dA938a55e10C3906651BD3701b75b98026b")).toBe("0x3060…026b");
    expect(truncateAddress(null)).toBe("—");
    expect(
      truncateHash("0x5a3202f813d4a52bd84ef9414dece9e4cd6730562ae692c3d8aba5cf7b1f7ab7")
    ).toBe("0x5a3202f8…7b1f7ab7");

    expect(formatPercentage(2.36)).toBe("+2.36%");
    expect(formatPercentage(-1.5)).toBe("-1.50%");

    const dt = formatDateTimeParts("2026-10-21T05:40:12.000Z");
    expect(dt.dateStr).toContain("2026");
    expect(dt.timeStr.length).toBeGreaterThan(0);
    expect(formatDateTimeParts("invalid").dateStr).toBe("—");
  });
});

