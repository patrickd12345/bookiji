import type { NotificationChannel } from "./NotificationChannel";

export interface NotificationEnvelope {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  quietHours?: boolean;
}
