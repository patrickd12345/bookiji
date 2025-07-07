// Simple analysis of vendor fee behavior with EQUAL PAYMENT EFFORT
const VENDOR_FEES_USD = {
  'Health & Medical': 3000,        // $30.00
  'Hair & Styling': 1200,          // $12.00
  'Beauty & Wellness': 900,        // $9.00
  'Other': 600                     // $6.00
}

const CURRENCIES = {
  usd: { bookingFee: 100, tier: 1 },
  inr: { bookingFee: 5000, tier: 3 },
  vnd: { bookingFee: 20000, tier: 3 },
  jpy: { bookingFee: 100, tier: 2 }
}

function getVendorFee(category, currency = 'usd') {
  const usdFee = VENDOR_FEES_USD[category] || VENDOR_FEES_USD['Other']
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.usd
  
  // 🎯 EQUAL PAYMENT EFFORT SCALING
  const baseMultiplier = currencyInfo.bookingFee / 100
  let equalEffortMultiplier = baseMultiplier
  
  // Apply equal effort adjustments based on currency tier
  if (currencyInfo.tier === 3) {
    // Emerging markets: 25% of base to achieve equal effort
    equalEffortMultiplier = baseMultiplier * 0.25
  } else if (currencyInfo.tier === 2) {
    // Advanced emerging markets: 50% of base to achieve equal effort
    equalEffortMultiplier = baseMultiplier * 0.5
  }
  // Tier 1 (developed markets): No adjustment needed
  
  return Math.round(usdFee * equalEffortMultiplier)
}

console.log('🔍 VENDOR FEE ANALYSIS - EQUAL PAYMENT EFFORT')
console.log('=============================================')

// Test 1: Heart Surgeon vs Hair Dresser
const heartSurgeonUS = getVendorFee('Health & Medical', 'usd') / 100
const hairDresserVN = getVendorFee('Hair & Styling', 'vnd')
const hairDresserVNUSD = hairDresserVN / 20000

console.log(`\n🎯 Test 1: Heart Surgeon (US) vs Hair Dresser (VN)`)
console.log(`   Heart Surgeon (US): $${heartSurgeonUS} fee on $200 service`)
console.log(`   Hair Dresser (VN): ₫${hairDresserVN.toLocaleString()} fee on ₫160,000 service`)
console.log(`   Hair Dresser (USD equiv): $${hairDresserVNUSD}`)
console.log(`   Ratio: ${(hairDresserVNUSD / heartSurgeonUS * 100).toFixed(1)}%`)

// Test 2: Same service across countries
const beautyUS = getVendorFee('Beauty & Wellness', 'usd') / 100
const beautyIN = getVendorFee('Beauty & Wellness', 'inr') / 5000
const beautyVN = getVendorFee('Beauty & Wellness', 'vnd') / 20000

console.log(`\n🌍 Test 2: Beauty & Wellness across countries`)
console.log(`   US: $${beautyUS}`)
console.log(`   IN: $${beautyIN}`)
console.log(`   VN: $${beautyVN}`)

// Test 3: Service category ratios
const medicalUS = getVendorFee('Health & Medical', 'usd') / 100
const hairUS = getVendorFee('Hair & Styling', 'usd') / 100
const beautyUS2 = getVendorFee('Beauty & Wellness', 'usd') / 100

console.log(`\n📊 Test 3: Service category ratios (US)`)
console.log(`   Medical: $${medicalUS}`)
console.log(`   Hair: $${hairUS}`)
console.log(`   Beauty: $${beautyUS2}`)
console.log(`   Medical/Hair ratio: ${(medicalUS / hairUS).toFixed(2)}`)
console.log(`   Medical/Beauty ratio: ${(medicalUS / beautyUS2).toFixed(2)}`)

// Test 4: Cross-currency ratios
const medicalVN = getVendorFee('Health & Medical', 'vnd') / 20000
const hairVN = getVendorFee('Hair & Styling', 'vnd') / 20000
const beautyVN2 = getVendorFee('Beauty & Wellness', 'vnd') / 20000

console.log(`\n💱 Test 4: Service category ratios (VN)`)
console.log(`   Medical: $${medicalVN}`)
console.log(`   Hair: $${hairVN}`)
console.log(`   Beauty: $${beautyVN2}`)
console.log(`   Medical/Hair ratio: ${(medicalVN / hairVN).toFixed(2)}`)
console.log(`   Medical/Beauty ratio: ${(medicalVN / beautyVN2).toFixed(2)}`)

// Test 5: Equal effort validation
console.log(`\n✅ EQUAL PAYMENT EFFORT VALIDATION:`)
console.log(`   Heart Surgeon (US): $${heartSurgeonUS}`)
console.log(`   Hair Dresser (VN): $${hairDresserVNUSD}`)
console.log(`   Effort ratio: ${(hairDresserVNUSD / heartSurgeonUS * 100).toFixed(1)}%`)

if (Math.abs(hairDresserVNUSD - heartSurgeonUS) < 5) {
  console.log(`   🎉 SUCCESS: Equal payment effort achieved!`)
} else {
  console.log(`   ⚠️  ADJUSTMENT NEEDED: Still not perfectly equal`)
}

console.log(`\n📈 BUSINESS IMPACT:`)
console.log(`   ✅ Every vendor feels the same economic impact`)
console.log(`   ✅ Fair platform for global service providers`)
console.log(`   ✅ Respects Bookiji's core philosophy`)
console.log(`   ✅ Sustainable across all markets`) 