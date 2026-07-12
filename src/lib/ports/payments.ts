export type PaymentIntentInput = {
  amountPence: number;
  currency?: string;
  bookingId?: string;
  clientId: string;
  providerId?: string;
  description?: string;
};

export type PaymentIntent = {
  id: string;
  status: "requires_payment" | "processing" | "succeeded" | "cancelled";
  amountPence: number;
  currency: string;
  clientSecret?: string;
  providerRef?: string;
};

export interface PaymentsPort {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  capture(intentId: string): Promise<PaymentIntent>;
  refund(intentId: string, amountPence?: number): Promise<PaymentIntent>;
}
