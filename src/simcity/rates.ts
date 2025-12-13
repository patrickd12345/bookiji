// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

export type RateConfig = {
  bookingAttempt: number;
  cancelAttempt: number;
  supportTicket: number;
  providerAvailabilityChange: number;
};

let rates: RateConfig = {
  bookingAttempt: 0.03,
  cancelAttempt: 0.01,
  supportTicket: 0.005,
  providerAvailabilityChange: 0.002
};

export function getRates(): RateConfig {
  return rates;
}

export function updateRates(partial: Partial<RateConfig>) {
  rates = { ...rates, ...partial };
  return rates;
}

export const RATES = new Proxy(rates, {
  get(_, key: keyof RateConfig) {
    return rates[key];
  }
}) as RateConfig;
