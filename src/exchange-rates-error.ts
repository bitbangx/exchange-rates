export class ExchangeRatesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeRatesError';
  }
}
