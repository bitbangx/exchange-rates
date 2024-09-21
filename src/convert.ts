import { ExchangeRatesApi } from "./exchange-rates-api";

/**
 * Convert the given amount from one currency to another using the exchange rate of the given date
 *
 * @param {number} amount                   The amount to convert
 * @param {string} fromCurrency             Which currency to convert from
 * @param {string} toCurrency               Which currency to convert to
 * @param {Date|string} [date='latest']     The date to request the historic rate
 *                                          (if omitted, defaults to 'latest')
 * @return {number}                         The converted amount
 */
export const convert = (amount: number, fromCurrency: string, toCurrency: string, date: Date | 'latest' = 'latest') => {
  // if (typeof amount !== 'number') {
  //   throw new TypeError("The 'amount' parameter has to be a number");
  // }

  // if (Array.isArray(toCurrency)) {
  //   throw new TypeError('Cannot convert to multiple currencies at the same time');
  // }

  // const instance = new ExchangeRatesApi();

  // if (date === 'latest') {
  //   instance.latest();
  // } else {
  //   instance.at(date);
  // }

  // return instance
  //   .base(fromCurrency)
  //   .symbols(toCurrency)
  //   .fetch<number>()
  //   .then((rate) => rate * amount);
};
