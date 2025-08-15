// Simple test to see actual PPP calculation results
import { 
  getPPPCustomerFee, 
  getPPPVendorFee, 
  calculatePPPAdjustedAmount,
  getPPPData 
} from './src/lib/ppp.ts'

console.log('🧪 Testing PPP Calculations:')

console.log('\n📊 PPP Data:')
console.log('US:', getPPPData('usd'))
console.log('IN:', getPPPData('inr'))
console.log('VN:', getPPPData('vnd'))
console.log('JP:', getPPPData('jpy'))

console.log('\n💰 Customer Fees:')
console.log(`US: $${getPPPCustomerFee('usd') / 100}`)
console.log(`IN: ₹${getPPPCustomerFee('inr') / 100}`)
console.log(`VN: ₫${getPPPCustomerFee('vnd')}`)
console.log(`JP: ¥${getPPPCustomerFee('jpy')}`)

console.log('\n🏥 Vendor Fees (Medical - $30):')
console.log(`US: $${getPPPVendorFee(3000, 'usd') / 100}`)
console.log(`IN: ₹${getPPPVendorFee(3000, 'inr') / 100}`)
console.log(`VN: ₫${getPPPVendorFee(3000, 'vnd')}`)
console.log(`JP: ¥${getPPPVendorFee(3000, 'jpy')}`)

console.log('\n🔍 Detailed Calculations:')
console.log('IN $1:', calculatePPPAdjustedAmount(1.0, 'inr'))
console.log('VN $1:', calculatePPPAdjustedAmount(1.0, 'vnd'))
console.log('IN $30:', calculatePPPAdjustedAmount(30.0, 'inr'))
console.log('VN $30:', calculatePPPAdjustedAmount(30.0, 'vnd')) 