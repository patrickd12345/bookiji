# 💰 Bookiji Vendor Fee System

## Overview

Bookiji implements a **15% of average service price** vendor fee system that scales appropriately across different currencies and service categories. This system ensures fair pricing for vendors while maintaining platform sustainability.

## 🏗️ Architecture

### Core Components

1. **Vendor Fee Configuration** (`src/lib/i18n/config.ts`)
   - `VENDOR_FEES_USD`: Base fees in USD cents by service category
   - `SERVICE_CATEGORY_MAPPING`: Normalizes various category names
   - Currency scaling functions

2. **Fee Calculation Functions**
   - `getVendorFee()`: Calculate fee for any category/currency
   - `getFormattedVendorFee()`: Format for display
   - `getVendorFeeBreakdown()`: Detailed fee information

## 💡 Fee Structure

### Service Category Tiers (USD Base)

| Category | Average Service Price | 15% Fee (USD) | Fee (cents) |
|----------|---------------------|---------------|-------------|
| **High-Value Services** | | | |
| Health & Medical | $200 | $30.00 | 3,000 |
| Legal Services | $200 | $30.00 | 3,000 |
| Professional Services | $120 | $18.00 | 1,800 |
| Financial Services | $150 | $22.50 | 2,250 |
| **Personal Care** | | | |
| Hair & Styling | $80 | $12.00 | 1,200 |
| Massage & Therapy | $90 | $13.50 | 1,350 |
| Fitness & Training | $80 | $12.00 | 1,200 |
| Beauty & Wellness | $60 | $9.00 | 900 |
| Nails & Spa | $70 | $10.50 | 1,050 |
| **Home Services** | | | |
| Plumbing | $100 | $15.00 | 1,500 |
| Electrical | $100 | $15.00 | 1,500 |
| Repairs & Installation | $90 | $13.50 | 1,350 |
| Home Services | $80 | $12.00 | 1,200 |
| Cleaning & Maintenance | $60 | $9.00 | 900 |
| **Creative Services** | | | |
| Photography & Video | $100 | $15.00 | 1,500 |
| Event Services | $120 | $18.00 | 1,800 |
| Creative Services | $80 | $12.00 | 1,200 |
| **Other Services** | | | |
| Automotive | $50 | $7.50 | 750 |
| Transportation | $60 | $9.00 | 900 |
| Tutoring & Education | $80 | $12.00 | 1,200 |
| Consulting | $120 | $18.00 | 1,800 |
| Pet Services | $60 | $9.00 | 900 |
| **Default** | | | |
| Other | $40 | $6.00 | 600 |

## 🌍 Currency Scaling

The vendor fee system uses the **same currency scaling factors** as customer commitment fees:

### Tier 1: Developed Markets (1:1 ratio)
- **USD**: $30.00 → $30.00
- **EUR**: $30.00 → €30.00
- **GBP**: $30.00 → £30.00
- **CAD**: $30.00 → C$30.00

### Tier 2: Advanced Emerging (local equivalent)
- **JPY**: $30.00 → ¥3,000
- **KRW**: $30.00 → ₩30,000
- **HKD**: $30.00 → HK$240
- **SGD**: $30.00 → S$45

### Tier 3: Emerging Markets (purchasing power adjusted)
- **INR**: $30.00 → ₹1,500
- **IDR**: $30.00 → Rp300,000
- **VND**: $30.00 → ₫600,000
- **THB**: $30.00 → ฿600

## 🔧 Implementation

### Basic Usage

```typescript
import { getVendorFee, getFormattedVendorFee, getVendorFeeBreakdown } from '@/lib/i18n/config'

// Get fee amount in cents
const fee = getVendorFee('Health & Medical', 'usd') // 3000 cents ($30.00)

// Get formatted fee for display
const formatted = getFormattedVendorFee('Health & Medical', 'inr') // "₹1,500"

// Get detailed breakdown
const breakdown = getVendorFeeBreakdown('Health & Medical', 'jpy')
// {
//   category: 'Health & Medical',
//   usdFee: 30,
//   localFee: 3000,
//   localFeeFormatted: '¥3,000',
//   currency: 'jpy',
//   currencySymbol: '¥',
//   percentage: 15,
//   description: '15% of average Health & Medical service price'
// }
```

### Service Category Normalization

The system automatically normalizes service categories:

```typescript
// These all map to 'Health & Medical' and get the same fee
getVendorFee('Medical', 'usd')           // 3000 cents
getVendorFee('Health & Medical', 'usd')  // 3000 cents
getVendorFee('Dental', 'usd')            // 3000 cents

// These map to 'Pet Services'
getVendorFee('Veterinary', 'usd')        // 900 cents
getVendorFee('Pet Care', 'usd')          // 900 cents
getVendorFee('Pet Services', 'usd')      // 900 cents
```

## 📊 Fee Calculation Examples

### Example 1: Hair Styling in Different Countries

```typescript
// USD: $12.00
getFormattedVendorFee('Hair & Styling', 'usd') // "$12.00"

// INR: ₹600 (adjusted for purchasing power)
getFormattedVendorFee('Hair & Styling', 'inr') // "₹600"

// JPY: ¥1,200 (local equivalent)
getFormattedVendorFee('Hair & Styling', 'jpy') // "¥1,200"
```

### Example 2: Medical Services Across Markets

```typescript
// High-value service in different currencies
getFormattedVendorFee('Health & Medical', 'usd') // "$30.00"
getFormattedVendorFee('Health & Medical', 'inr') // "₹1,500"
getFormattedVendorFee('Health & Medical', 'jpy') // "¥3,000"
getFormattedVendorFee('Health & Medical', 'krw') // "₩30,000"
```

## 🔄 Integration Points

### 1. Vendor Registration
- Calculate and display vendor fees during onboarding
- Show fee breakdown by service category

### 2. Booking Creation
- Apply vendor fee when creating bookings
- Store fee amount in booking record

### 3. Payment Processing
- Include vendor fee in payment calculations
- Separate vendor fee from service payment

### 4. Analytics & Reporting
- Track vendor fees by category and currency
- Monitor fee collection and distribution

## 🛡️ Business Logic

### Fee Collection
- **When**: At booking creation
- **Amount**: 15% of average service price for category
- **Currency**: Scaled to local currency
- **Refund**: Not applicable (vendor fee, not customer fee)

### Fee Distribution
- **Platform Revenue**: Vendor fees contribute to platform sustainability
- **Service Provider Payment**: Separate from final service payment
- **Transparency**: Clear breakdown provided to vendors

### Fee Adjustments
- **Category Changes**: Fee updates when service category changes
- **Currency Fluctuations**: Automatic scaling based on currency rates
- **Market Conditions**: Manual adjustments for economic changes

## 📈 Future Enhancements

### Planned Features
1. **Dynamic Pricing**: Adjust fees based on market demand
2. **Volume Discounts**: Reduce fees for high-volume vendors
3. **Seasonal Adjustments**: Temporary fee changes for peak periods
4. **Regional Variations**: Custom fees for specific markets

### Analytics Integration
1. **Fee Performance**: Track fee collection vs. service value
2. **Vendor Satisfaction**: Monitor impact on vendor retention
3. **Market Analysis**: Compare fees across regions and categories

## 🔍 Testing

### Unit Tests
```typescript
// Test fee calculations
expect(getVendorFee('Health & Medical', 'usd')).toBe(3000)
expect(getVendorFee('Health & Medical', 'inr')).toBe(150000)

// Test formatting
expect(getFormattedVendorFee('Health & Medical', 'usd')).toBe('$30.00')
expect(getFormattedVendorFee('Health & Medical', 'jpy')).toBe('¥3,000')
```

### Integration Tests
- Test fee application in booking flow
- Test currency conversion accuracy
- Test category normalization

## 📚 Related Documentation

- [Currency Configuration](./src/lib/i18n/config.ts)
- [Payment Processing](./src/lib/stripe.ts)
- [Booking Engine](./src/lib/bookingEngine.ts)
- [Database Schema](./supabase/migrations/)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: Bookiji Development Team 