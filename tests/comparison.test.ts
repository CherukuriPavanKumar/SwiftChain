import { describe, it, expect } from "vitest";
import {
  calculateRemittanceComparison,
  SUPPORTED_DESTINATIONS,
} from "../lib/comparison";

describe("Savings Comparison (calculateRemittanceComparison)", () => {
  it("safely returns null for invalid inputs", () => {
    expect(calculateRemittanceComparison(0, 94.85)).toBeNull();
    expect(calculateRemittanceComparison(-500, 94.85)).toBeNull();
    expect(calculateRemittanceComparison(10000, 0)).toBeNull();
    expect(calculateRemittanceComparison(NaN, 94.85)).toBeNull();
  });

  it("calculates accurate US corridor metrics and marks sourcing correctly", () => {
    const resUs = calculateRemittanceComparison(10000, 94.85, "US", 25);
    expect(resUs).not.toBeNull();
    expect(resUs?.destination.currency).toBe("USD");
    expect(resUs?.providers.length).toBe(3);

    const swiftchain = resUs!.providers.find((p) => p.id === "swiftchain")!;
    const bank = resUs!.providers.find((p) => p.id === "bank_wire")!;
    const mto = resUs!.providers.find((p) => p.id === "legacy_mto")!;

    expect(swiftchain.isSourced).toBe(true);
    expect(bank.isSourced).toBe(false);
    expect(mto.isSourced).toBe(false);

    expect(swiftchain.serviceFeeInr).toBe(0);
    expect(swiftchain.fxMarkupPercent).toBe(0);
    expect(swiftchain.networkFeeInr).toBe(25);
    expect(swiftchain.totalSenderCostInr).toBe(10025);

    const expectedUsd = 10000 / 94.85;
    expect(Math.abs(swiftchain.destinationAmountDelivered - expectedUsd)).toBeLessThan(0.001);

    expect(bank.destinationAmountDelivered).toBeLessThan(swiftchain.destinationAmountDelivered);
    expect(mto.destinationAmountDelivered).toBeLessThan(swiftchain.destinationAmountDelivered);
  });

  it("supports all configured international destinations", () => {
    for (const dest of SUPPORTED_DESTINATIONS) {
      const res = calculateRemittanceComparison(50000, 94.85, dest.id);
      expect(res).not.toBeNull();
      expect(res?.destination.id).toBe(dest.id);
      expect(res?.destination.currency).toBe(dest.currency);

      const sc = res!.providers.find((p) => p.id === "swiftchain")!;
      expect(sc.destinationAmountDelivered).toBeGreaterThan(0);
    }
  });

  it("honors custom fee assumption overrides", () => {
    const customConfig = {
      bankWireFeeInr: 2000,
      bankFxMarkupPercent: 4.5,
      bankIntermediaryFeeUsd: 25.0,
      mtoServiceFeeInr: 600,
      mtoFxMarkupPercent: 3.0,
    };
    const res = calculateRemittanceComparison(20000, 95.0, "US", 30, customConfig);
    const bank = res!.providers.find((p) => p.id === "bank_wire")!;
    const mto = res!.providers.find((p) => p.id === "legacy_mto")!;

    expect(bank.serviceFeeInr).toBe(2000);
    expect(bank.fxMarkupPercent).toBe(4.5);
    expect(bank.intermediaryFeeLocal).toBe(25.0);
    expect(mto.serviceFeeInr).toBe(600);
    expect(mto.fxMarkupPercent).toBe(3.0);
  });

  it("handles boundary amounts properly without negative delivery", () => {
    const resSmall = calculateRemittanceComparison(500, 94.85, "US");
    const smallBank = resSmall!.providers.find((p) => p.id === "bank_wire")!;
    expect(smallBank.destinationAmountDelivered).toBe(0);

    const resLarge = calculateRemittanceComparison(1000000, 94.85, "US");
    const largeSwiftchain = resLarge!.providers.find((p) => p.id === "swiftchain")!;
    const largeBank = resLarge!.providers.find((p) => p.id === "bank_wire")!;
    expect(largeSwiftchain.destinationAmountDelivered).toBeGreaterThan(largeBank.destinationAmountDelivered);
  });
});
