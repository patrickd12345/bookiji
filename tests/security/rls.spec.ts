import { describe, it, expect } from 'vitest';
import { testCrossTenantAccess } from '@/lib/security/rlsValidator';

const tables = ['profiles', 'bookings', 'services', 'availability_slots', 'notifications', 'reviews'];

describe('RLS policies', () => {
  tables.forEach((table) => {
    it(`denies cross-tenant access for ${table}`, async () => {
      const result = await testCrossTenantAccess(table, 'user1', 'user2');
      expect(result).toBe(false);
    });
  });
});
