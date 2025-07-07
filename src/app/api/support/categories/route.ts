import { NextResponse } from 'next/server'

/**
 * GET /api/support/categories
 */
export async function GET() {
  try {
    const categories = [
      { id: 'general', name: 'General Questions', description: 'General platform questions' },
      { id: 'booking', name: 'Booking Issues', description: 'Problems with bookings' },
      { id: 'payment', name: 'Payment Problems', description: 'Payment and billing issues' },
      { id: 'technical', name: 'Technical Support', description: 'Technical problems' },
      { id: 'account', name: 'Account Issues', description: 'Account and profile problems' }
    ];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching support categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
} 