export type PaymentIntentInput = {
  amountPence: number;
  currency?: string;
  bookingId?: string;
  clientId: string;
  providerId?: string;
  description?: string;
  /**
   * Platform fee in basis points (e.g. 1500 = 15%).
   * Defaults to PLATFORM_FEE_BPS env or 1500.
   */
  platformFeeBps?: number;
  /** Stripe Connect account id (acct_…). Overrides lookup from provider profile. */
  transferDestination?: string;
};

export type PaymentIntent = {
  id: string;
  status: "requires_payment" | "processing" | "succeeded" | "cancelled";
  amountPence: number;
  currency: string;
  clientSecret?: string;
  providerRef?: string;
  applicationFeePence?: number;
  transferDestination?: string;
};

export type ConnectAccountLink = {
  accountId: string;
  url: string;
  status: "pending" | "active" | "restricted";
};

export interface PaymentsPort {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  capture(intentId: string): Promise<PaymentIntent>;
  refund(intentId: string, amountPence?: number): Promise<PaymentIntent>;
  /**
   * Create or refresh a Stripe Connect Express account + onboarding link.
   * Stub returns a demo account id without external calls.
   */
  ensureConnectAccount?(input: {
    providerId: string;
    email: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<ConnectAccountLink>;
}
