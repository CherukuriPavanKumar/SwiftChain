import { describe, it, expect } from "vitest";
import { SUPPORTED_TOKENS, ERC20_MINIMAL_ABI } from "../lib/tokens";
import { sepolia } from "wagmi/chains";

describe("Token Configurations & ABI (lib/tokens)", () => {
  it("defines Native ETH with 18 decimals on Sepolia", () => {
    const eth = SUPPORTED_TOKENS.ETH;
    expect(eth.symbol).toBe("ETH");
    expect(eth.decimals).toBe(18);
    expect(eth.isNative).toBe(true);
    expect(eth.chainId).toBe(sepolia.id);
    expect(eth.contractAddress).toBeUndefined();
  });

  it("defines Circle USDC with 6 decimals and official Sepolia contract address", () => {
    const usdc = SUPPORTED_TOKENS.USDC;
    expect(usdc.symbol).toBe("USDC");
    expect(usdc.decimals).toBe(6);
    expect(usdc.isNative).toBe(false);
    expect(usdc.chainId).toBe(sepolia.id);
    expect(usdc.contractAddress).toBe("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
  });

  it("provides minimal ERC-20 ABI with required methods", () => {
    const methodNames = ERC20_MINIMAL_ABI.map((item) => item.name);
    expect(methodNames).toContain("balanceOf");
    expect(methodNames).toContain("transfer");
    expect(methodNames).toContain("decimals");
    expect(methodNames).toContain("symbol");
  });
});
