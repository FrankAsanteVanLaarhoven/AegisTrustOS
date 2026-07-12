export type NotifyChannel = "email" | "sms" | "in_app";

export type NotifyMessage = {
  channel: NotifyChannel;
  to: string;
  subject: string;
  body: string;
  templateKey?: string;
  meta?: Record<string, unknown>;
};

export interface Notifier {
  send(message: NotifyMessage): Promise<{ id: string; status: "queued" | "sent" | "failed" }>;
}
