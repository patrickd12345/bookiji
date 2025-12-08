import { faker } from '@faker-js/faker';
import { ScenarioOverride, SimulationState, SyntheticBooking } from './types';

const DEFAULT_BOOKINGS_PER_TICK = 3;

const pickStatus = (override?: ScenarioOverride): SyntheticBooking['status'] => {
  const roll = Math.random();
  const cancelRate = override?.cancelRate ?? 0.15;
  const confirmRate = override?.confirmRate ?? 0.65;

  if (roll < cancelRate) return 'cancelled';
  if (roll < cancelRate + confirmRate) return 'confirmed';
  return 'pending';
};

const bookingPrice = (override?: ScenarioOverride): number => {
  const base = faker.number.float({ min: 50, max: 300 });
  return Math.round(base * (override?.priceMultiplier ?? 1));
};

export const generateSyntheticBookings = (
  state: SimulationState,
  override?: ScenarioOverride,
): SyntheticBooking[] => {
  const perTick = Math.max(1, Math.round((override?.spawnRate ?? 1) * DEFAULT_BOOKINGS_PER_TICK));

  return Array.from({ length: perTick }).map(() => {
    const startsAt = state.time + faker.number.int({ min: 10, max: 240 }) * 60 * 1000;
    return {
      id: faker.string.uuid(),
      customerId: faker.string.uuid(),
      vendorId: faker.string.uuid(),
      createdAt: state.time,
      startsAt,
      durationMinutes: faker.number.int({ min: 30, max: 180 }),
      status: pickStatus(override),
      price: bookingPrice(override),
      rescheduled: faker.datatype.boolean({ probability: 0.1 }),
      tags: override?.tags ?? [],
    } as SyntheticBooking;
  });
};
