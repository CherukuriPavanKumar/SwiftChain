import { formatINR, formatUSD } from './quote';

export { formatINR, formatUSD };

export interface RemittanceDestination {
  id: string;
  country: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  payoutRail: string;
  rateMultiplier: number; // multiplier against USD (e.g. 1.0 for USD, 0.78 for GBP, 0.92 for EUR, 3.6725 for AED)
}

export const SUPPORTED_DESTINATIONS: RemittanceDestination[] = [
  {
    id: 'US',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    flag: '🇺🇸',
    payoutRail: 'ACH / Fedwire (Simulated)',
    rateMultiplier: 1.0,
  },
  {
    id: 'GB',
    country: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    flag: '🇬🇧',
    payoutRail: 'Faster Payments / FPS (Simulated)',
    rateMultiplier: 0.78,
  },
  {
    id: 'EU',
    country: 'Eurozone',
    currency: 'EUR',
    currencySymbol: '€',
    flag: '🇪🇺',
    payoutRail: 'SEPA Instant (Simulated)',
    rateMultiplier: 0.92,
  },
  {
    id: 'AE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    flag: '🇦🇪',
    payoutRail: 'UAEFTS (Simulated)',
    rateMultiplier: 3.6725,
  },
];

export interface ComparisonProvider {
  id: 'swiftchain' | 'bank_wire' | 'legacy_mto';
  name: string;
  category: 'Web3 / Stablecoin' | 'Retail Bank Wire' | 'Money Transfer Operator';
  serviceFeeInr: number;
  exchangeRate: number; // INR per unit of destination currency
  fxMarkupPercent: number; // Surcharged percentage above base spot rate
  fxCostInr: number; // Hidden fee in FX markup
  networkFeeInr: number; // Estimated gas / processing fee
  intermediaryFeeLocal: number; // Third party / correspondent bank deduction in local currency
  totalSenderCostInr: number;
  destinationAmountDelivered: number;
  destinationCurrency: string;
  destinationSymbol: string;
  deliverySpeed: string;
  isSourced: boolean;
  notes: string;
}

export interface ComparisonResult {
  sourceAmountInr: number;
  destination: RemittanceDestination;
  spotReferenceRateUsd: number; // Sourced spot rate (INR per USD)
  corridorReferenceRate: number; // Spot rate for destination currency (INR per Local unit)
  providers: ComparisonProvider[];
  illustrativeDisclaimer: string;
}

export interface ComparisonConfig {
  bankWireFeeInr?: number; // Default ₹1,500
  bankFxMarkupPercent?: number; // Default 3.0%
  bankIntermediaryFeeUsd?: number; // Default $15.00
  mtoServiceFeeInr?: number; // Default ₹400
  mtoFxMarkupPercent?: number; // Default 2.2%
}

export const DEFAULT_COMPARISON_CONFIG: Required<ComparisonConfig> = {
  bankWireFeeInr: 1500,
  bankFxMarkupPercent: 3.0,
  bankIntermediaryFeeUsd: 15.0,
  mtoServiceFeeInr: 400,
  mtoFxMarkupPercent: 2.2,
};

export function formatDestinationCurrency(value: number, currency: string, symbol: string): string {
  if (isNaN(value)) return `0.00 ${currency}`;
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculates comparative remittance costs across SwiftChain and traditional rails.
 * Separates sourced market data (CoinGecko spot & Sepolia gas) from transparent illustrative benchmarks.
 */
export function calculateRemittanceComparison(
  sourceAmountInr: number,
  spotUsdInrRate: number,
  destinationId: string = 'US',
  networkGasFeeInr: number = 25, // Live estimated Sepolia ETH gas in INR
  config: ComparisonConfig = {}
): ComparisonResult | null {
  if (
    !sourceAmountInr ||
    isNaN(sourceAmountInr) ||
    sourceAmountInr <= 0 ||
    !spotUsdInrRate ||
    isNaN(spotUsdInrRate) ||
    spotUsdInrRate <= 0
  ) {
    return null;
  }

  const destination =
    SUPPORTED_DESTINATIONS.find((d) => d.id === destinationId) ?? SUPPORTED_DESTINATIONS[0];

  const {
    bankWireFeeInr,
    bankFxMarkupPercent,
    bankIntermediaryFeeUsd,
    mtoServiceFeeInr,
    mtoFxMarkupPercent,
  } = { ...DEFAULT_COMPARISON_CONFIG, ...config };

  // Base spot rate for the destination corridor:
  // e.g. If 1 USD = ₹94.85 and 1 USD = 0.78 GBP, then 1 GBP = ₹(94.85 / 0.78) ≈ ₹121.60
  const corridorSpotRate = spotUsdInrRate / destination.rateMultiplier;

  // 1. SwiftChain Prototype (Circle USDC / Sepolia testnet)
  // Sourced: CoinGecko spot market rate without retail markup
  // Platform Fee: ₹0.00 (MVP promotion)
  // Gas: Live estimated Sepolia ETH network fee
  const swiftchainRate = corridorSpotRate;
  const swiftchainDelivered = sourceAmountInr / swiftchainRate;
  const swiftchainTotalCostInr = sourceAmountInr + networkGasFeeInr;

  const swiftchainProvider: ComparisonProvider = {
    id: 'swiftchain',
    name: 'SwiftChain (Circle USDC)',
    category: 'Web3 / Stablecoin',
    serviceFeeInr: 0,
    exchangeRate: swiftchainRate,
    fxMarkupPercent: 0.0,
    fxCostInr: 0,
    networkFeeInr: networkGasFeeInr,
    intermediaryFeeLocal: 0,
    totalSenderCostInr: swiftchainTotalCostInr,
    destinationAmountDelivered: swiftchainDelivered,
    destinationCurrency: destination.currency,
    destinationSymbol: destination.currencySymbol,
    deliverySpeed: 'Sepolia block finality (~12–30s on testnet)',
    isSourced: true,
    notes:
      'Sourced CoinGecko spot rate without retail margin. 0% SwiftChain platform fee. Network gas paid in Sepolia ETH. Testnet simulation; does not include production third-party fiat on/off-ramp fees.',
  };

  // 2. Traditional Retail Bank Wire (e.g. SWIFT via retail bank)
  // Retail markup added to interbank rate: rate = spot * (1 + markup/100)
  const bankRate = corridorSpotRate * (1 + bankFxMarkupPercent / 100);
  const bankFxCostInr = sourceAmountInr * (bankFxMarkupPercent / 100);
  const grossBankDelivered = sourceAmountInr / bankRate;
  const intermediaryDeductionLocal = bankIntermediaryFeeUsd * destination.rateMultiplier;
  const netBankDelivered = Math.max(0, grossBankDelivered - intermediaryDeductionLocal);
  const bankTotalCostInr = sourceAmountInr + bankWireFeeInr;

  const bankProvider: ComparisonProvider = {
    id: 'bank_wire',
    name: 'Traditional Bank Wire (SWIFT)',
    category: 'Retail Bank Wire',
    serviceFeeInr: bankWireFeeInr,
    exchangeRate: bankRate,
    fxMarkupPercent: bankFxMarkupPercent,
    fxCostInr: bankFxCostInr,
    networkFeeInr: 0,
    intermediaryFeeLocal: intermediaryDeductionLocal,
    totalSenderCostInr: bankTotalCostInr,
    destinationAmountDelivered: netBankDelivered,
    destinationCurrency: destination.currency,
    destinationSymbol: destination.currencySymbol,
    deliverySpeed: '2 – 4 Business Days',
    isSourced: false,
    notes: `Illustrative retail bank benchmark: ₹${bankWireFeeInr} wire fee + ${bankFxMarkupPercent}% FX spread + ~${destination.currencySymbol}${intermediaryDeductionLocal.toFixed(2)} correspondent bank deduction.`,
  };

  // 3. Traditional Money Transfer Operator (MTO)
  const mtoRate = corridorSpotRate * (1 + mtoFxMarkupPercent / 100);
  const mtoFxCostInr = sourceAmountInr * (mtoFxMarkupPercent / 100);
  const mtoDelivered = sourceAmountInr / mtoRate;
  const mtoTotalCostInr = sourceAmountInr + mtoServiceFeeInr;

  const mtoProvider: ComparisonProvider = {
    id: 'legacy_mto',
    name: 'Traditional Transfer Operator',
    category: 'Money Transfer Operator',
    serviceFeeInr: mtoServiceFeeInr,
    exchangeRate: mtoRate,
    fxMarkupPercent: mtoFxMarkupPercent,
    fxCostInr: mtoFxCostInr,
    networkFeeInr: 0,
    intermediaryFeeLocal: 0,
    totalSenderCostInr: mtoTotalCostInr,
    destinationAmountDelivered: mtoDelivered,
    destinationCurrency: destination.currency,
    destinationSymbol: destination.currencySymbol,
    deliverySpeed: '1 – 2 Business Days',
    isSourced: false,
    notes: `Illustrative MTO benchmark: ₹${mtoServiceFeeInr} service charge + ${mtoFxMarkupPercent}% retail FX margin.`,
  };

  return {
    sourceAmountInr,
    destination,
    spotReferenceRateUsd: spotUsdInrRate,
    corridorReferenceRate: corridorSpotRate,
    providers: [swiftchainProvider, mtoProvider, bankProvider],
    illustrativeDisclaimer:
      'Comparison Disclaimer: Traditional remittance figures are illustrative industry averages for retail cross-border transfers. SwiftChain figures represent testnet stablecoin execution with simulated destination payout and do not constitute actual legal fiat banking rails or production fiat ramp costs.',
  };
}
