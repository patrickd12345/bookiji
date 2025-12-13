import type { NotificationChannel } from "./NotificationChannel";

export interface NotificationEnvelope {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  payload: Record<string, any>;
  quietHours?: boolean;
}
