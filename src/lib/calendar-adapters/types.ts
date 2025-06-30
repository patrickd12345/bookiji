export type BusySlot = {
  start: Date;
  end: Date;
};

export interface CalendarAdapter {
  getBusySlots(providerId: string): Promise<BusySlot[]>;
} 