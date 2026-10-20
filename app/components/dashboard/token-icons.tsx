import React from "react";

export function EthereumIcon({
  className = "w-9 h-9",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "color";
}) {
  if (variant === "color") {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#4E5EE4] to-[#2E3BA7] text-white shadow-sm ${className}`}
        aria-label="Ethereum logo"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 32 32">
          <path fillOpacity="0.8" d="M16 3L6 18.5 16 23.5l10-5z" />
          <path d="M16 3l10 15.5L16 23.5V3z" />
          <path fillOpacity="0.6" d="M16 24.5L6 19.5 16 31l10-11.5z" />
          <path fillOpacity="0.9" d="M16 24.5l10-5L16 31v-6.5z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 bg-[#243029] border border-[#3A4B42] text-[#E8ECE9] shadow-sm ${className}`}
      aria-label="Ethereum logo"
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 32 32">
        <path fillOpacity="0.8" d="M16 3L6 18.5 16 23.5l10-5z" />
        <path d="M16 3l10 15.5L16 23.5V3z" />
        <path fillOpacity="0.6" d="M16 24.5L6 19.5 16 31l10-11.5z" />
        <path fillOpacity="0.9" d="M16 24.5l10-5L16 31v-6.5z" />
      </svg>
    </div>
  );
}

export function UsdcIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 bg-[#2775CA] text-white shadow-sm font-bold ${className}`}
      aria-label="USD Coin logo"
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 32 32">
        <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4zm-.2 20.4c-4.1 0-6.9-2.2-6.9-5.7 0-3.6 2.5-4.8 5.6-5.4 2.2-.4 3.7-.9 3.7-2.1 0-1.2-1-1.9-2.5-1.9-1.9 0-2.8.9-3 2.5l-2.4-.4c.4-2.5 2-3.9 4.7-4.2V5.5h1.9v2.1c3.5.4 5.9 2.5 5.9 5.4 0 3.2-2.3 4.5-5.6 5.1-2.4.5-3.7 1-3.7 2.2 0 1.3 1.2 2.1 2.9 2.1 2.2 0 3.3-1.1 3.5-2.8l2.5.4c-.4 2.7-2.3 4.2-5.2 4.5v2.3h-1.9v-2.4z" />
      </svg>
    </div>
  );
}

export function SwiftChainLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`text-[#8BE3BB] flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="m4 8 4-4 4 4" />
        <path d="M8 4v10a4 4 0 0 0 4 4h8" />
        <path d="m20 16-4 4-4-4" />
        <path d="M16 20V10a4 4 0 0 0-4-4H4" />
      </svg>
    </div>
  );
}

export function UserIdenticon({ address, size = 32 }: { address?: string; size?: number }) {
  // Deterministic pleasing gradient based on address
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 shrink-0 border border-white/20 shadow-sm"
      title={address ?? "Wallet Avatar"}
    />
  );
}
