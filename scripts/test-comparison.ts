import {
  calculateRemittanceComparison,
  SUPPORTED_DESTINATIONS,
} from '../lib/comparison';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

function runTests() {
  console.log('🧪 Starting SwiftChain Savings Comparison & Settlement Tracker Unit Tests...\n');

  // Test 1: Basic validation on null/invalid inputs
  console.log('Test 1: Handling edge case inputs (zero, negative, NaN)');
  assert(calculateRemittanceComparison(0, 94.85) === null, 'Should return null for 0 INR');
  assert(calculateRemittanceComparison(-500, 94.85) === null, 'Should return null for negative INR');
  assert(calculateRemittanceComparison(10000, 0) === null, 'Should return null for 0 spot rate');
  assert(calculateRemittanceComparison(NaN, 94.85) === null, 'Should return null for NaN INR');
  console.log('✅ Test 1 Passed: Invalid inputs safely returned null.\n');

  // Test 2: Standard US corridor calculation (₹10,000 at ₹94.85/USD)
  console.log('Test 2: Standard US corridor (USD via Circle USDC)');
  const resUs = calculateRemittanceComparison(10000, 94.85, 'US', 25);
  assert(resUs !== null, 'Comparison result should not be null');
  assert(resUs!.destination.currency === 'USD', 'Destination currency should be USD');
  assert(resUs!.providers.length === 3, 'Should provide 3 comparison rails');

  const swiftchain = resUs!.providers.find((p) => p.id === 'swiftchain')!;
  const bank = resUs!.providers.find((p) => p.id === 'bank_wire')!;
  const mto = resUs!.providers.find((p) => p.id === 'legacy_mto')!;

  assert(swiftchain.isSourced === true, 'SwiftChain should be marked as live sourced');
  assert(bank.isSourced === false, 'Bank wire should be marked as illustrative');
  assert(mto.isSourced === false, 'MTO should be marked as illustrative');

  // SwiftChain 0% platform fee, 0% FX markup
  assert(swiftchain.serviceFeeInr === 0, 'SwiftChain platform fee should be 0');
  assert(swiftchain.fxMarkupPercent === 0, 'SwiftChain FX markup should be 0%');
  assert(swiftchain.networkFeeInr === 25, 'SwiftChain network gas fee should be 25 INR');
  assert(swiftchain.totalSenderCostInr === 10025, 'Total sender cost should be ₹10,025');

  // Expected delivered USD: 10000 / 94.85 ≈ 105.4296
  const expectedUsd = 10000 / 94.85;
  assert(
    Math.abs(swiftchain.destinationAmountDelivered - expectedUsd) < 0.001,
    `Delivered USD mismatch: got ${swiftchain.destinationAmountDelivered}, expected ${expectedUsd}`
  );

  // Bank Wire:
  // Bank rate: 94.85 * (1 + 0.03) = 97.6955
  // Gross USD: 10000 / 97.6955 ≈ 102.3588
  // Intermediary deduction: $15.00
  // Net USD: 102.3588 - 15 = 87.3588
  // Total cost: 10000 + 1500 = 11500
  assert(bank.totalSenderCostInr === 11500, 'Bank total cost should be ₹11,500');
  assert(bank.destinationAmountDelivered < swiftchain.destinationAmountDelivered, 'Bank net USD should be less than SwiftChain');
  assert(
    Math.abs(bank.destinationAmountDelivered - (10000 / (94.85 * 1.03) - 15)) < 0.01,
    'Bank net USD calculation mismatch'
  );

  // MTO:
  // MTO rate: 94.85 * (1 + 0.022) = 96.9367
  // Delivered USD: 10000 / 96.9367 ≈ 103.16
  // Total cost: 10000 + 400 = 10400
  assert(mto.totalSenderCostInr === 10400, 'MTO total cost should be ₹10,400');
  assert(mto.destinationAmountDelivered < swiftchain.destinationAmountDelivered, 'MTO net USD should be less than SwiftChain');

  console.log(`  SwiftChain Delivered: $${swiftchain.destinationAmountDelivered.toFixed(2)} USD (Cost: ₹${swiftchain.totalSenderCostInr})`);
  console.log(`  MTO Delivered:        $${mto.destinationAmountDelivered.toFixed(2)} USD (Cost: ₹${mto.totalSenderCostInr})`);
  console.log(`  Bank Wire Delivered:  $${bank.destinationAmountDelivered.toFixed(2)} USD (Cost: ₹${bank.totalSenderCostInr})`);
  console.log('✅ Test 2 Passed: US corridor calculations mathematically correct.\n');

  // Test 3: Multi-corridor support (GB - GBP, EU - EUR, AE - AED)
  console.log('Test 3: Multi-corridor conversion');
  for (const dest of SUPPORTED_DESTINATIONS) {
    const res = calculateRemittanceComparison(50000, 94.85, dest.id);
    assert(res !== null, `Result for ${dest.id} should not be null`);
    assert(res!.destination.id === dest.id, `Destination ID should match ${dest.id}`);
    assert(res!.destination.currency === dest.currency, `Currency should match ${dest.currency}`);

    const sc = res!.providers.find((p) => p.id === 'swiftchain')!;
    assert(sc.destinationAmountDelivered > 0, 'Delivered amount should be positive');
    console.log(`  Corridor ${dest.country} (${dest.currency}): ${dest.currencySymbol}${sc.destinationAmountDelivered.toFixed(2)}`);
  }
  console.log('✅ Test 3 Passed: Multi-corridor conversions verified.\n');

  // Test 4: Custom Configurable Assumptions
  console.log('Test 4: Configurable fee assumptions overrides');
  const customConfig = {
    bankWireFeeInr: 2000,
    bankFxMarkupPercent: 4.5,
    bankIntermediaryFeeUsd: 25.0,
    mtoServiceFeeInr: 600,
    mtoFxMarkupPercent: 3.0,
  };
  const resCustom = calculateRemittanceComparison(20000, 95.0, 'US', 30, customConfig);
  const customBank = resCustom!.providers.find((p) => p.id === 'bank_wire')!;
  const customMto = resCustom!.providers.find((p) => p.id === 'legacy_mto')!;

  assert(customBank.serviceFeeInr === 2000, 'Overridden bank wire fee should be 2000');
  assert(customBank.fxMarkupPercent === 4.5, 'Overridden FX markup should be 4.5%');
  assert(customBank.intermediaryFeeLocal === 25.0, 'Overridden intermediary fee should be 25.0');
  assert(customMto.serviceFeeInr === 600, 'Overridden MTO service fee should be 600');
  assert(customMto.fxMarkupPercent === 3.0, 'Overridden MTO markup should be 3.0%');
  console.log('✅ Test 4 Passed: Configurable overrides handled cleanly.\n');

  // Test 5: High Value and Low Value boundary checks
  console.log('Test 5: Boundary checks (Small vs High transfer values)');
  // Small amount: ₹500 (Where traditional bank fees exceed the transfer amount)
  const resSmall = calculateRemittanceComparison(500, 94.85, 'US');
  const smallBank = resSmall!.providers.find((p) => p.id === 'bank_wire')!;
  assert(smallBank.destinationAmountDelivered === 0, 'Bank wire net delivered should floor at 0 when fees exceed gross');

  // Large amount: ₹1,000,000
  const resLarge = calculateRemittanceComparison(1000000, 94.85, 'US');
  const largeSwiftchain = resLarge!.providers.find((p) => p.id === 'swiftchain')!;
  const largeBank = resLarge!.providers.find((p) => p.id === 'bank_wire')!;
  assert(largeSwiftchain.destinationAmountDelivered > largeBank.destinationAmountDelivered, 'SwiftChain delivered must exceed bank wire on large amounts');
  console.log('✅ Test 5 Passed: Boundary conditions handled without negative amounts or overflow.\n');

  console.log('🎉 All 5 test suites passed successfully!\n');
}

runTests();
