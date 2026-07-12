export type DomainEventType =
  | "auth.login_ok"
  | "auth.login_fail"
  | "auth.rate_limited"
  | "provider.profile_updated"
  | "provider.credential_added"
  | "provider.category_submitted"
  | "provider.idv_completed"
  | "trust.decision"
  | "trust.cleared"
  | "request.created"
  | "request.matched"
  | "booking.created"
  | "booking.completed"
  | "incident.opened"
  | "incident.resolved"
  | "review.created";

export type DomainEvent = {
  type: DomainEventType;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  payload?: Record<string, unknown>;
  tenantId?: string | null;
  occurredAt?: Date;
};

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}
