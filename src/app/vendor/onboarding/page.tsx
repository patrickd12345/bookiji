'use client';

import { useRouter } from 'next/navigation';
import VendorRegistration from '@/components/VendorRegistration';

export default function VendorOnboardingPage() {
  const router = useRouter();
  return (
    <VendorRegistration onSuccess={() => router.push('/vendor/dashboard')} />
  );
}
