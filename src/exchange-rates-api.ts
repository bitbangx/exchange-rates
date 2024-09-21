/**
 * An API wrapper around api.ratesapi.io
 *
 * @module exchange-rate-api
 * @author over-engineer
 */

import { getYear, isAfter } from 'date-fns';

import { ExchangeRatesError } from './exchange-rates-error';
import { QueryStringBuilder } from './query-string-builder';
import { currencies } from './currencies';
import { formatDate, parseDate, untrailingSlashIt } from './utils';

import axios from 'axios';

/**
 * ExchangeRates
 */
export class ExchangeRatesApi {
  private _apiBaseUrl: string;
  private _accessKey: string;

  // Base currency, defaults to 'EUR'
  private _base?: string;

  // Exchange rates to fetch
  private _symbols?: string[];

  // Date from which to request historical rates
  private _from: 'latest' | Date = 'latest';

  // Date to which to request historical rates
  private _to?: Date;

  constructor({ accessKey, url }: { accessKey: string; url: string }) {
    this._apiBaseUrl = untrailingSlashIt(url);
    this._accessKey = accessKey;
  }

  /**
   * Throw an error if the given currency is not supported
   *
   * @throws {ExchangeRatesError}     Will throw an error if the given currency
   *                                  doesn't exist in the `currencies` object
   */
  _validateCurrency(currency: string) {
    if (!(currency in currencies)) {
      throw new ExchangeRatesError(`${currency} is not a valid currency`);
    }
  }

  /**
   * Determine whether this request should call the /history endpoint or not
   *
   * @return {boolean}                Whether this a history request or not
   */
  _isHistoryRequest(): boolean {
    return this._to !== undefined;
  }

  /**
   * Throw an error if any of our validations fails
   *
   * @throws {ExchangeRatesError}     Will throw an error if any validation fails
   */
  _validate() {
    if (this._isHistoryRequest()) {
      if (this._from === 'latest') {
        throw new ExchangeRatesError("Cannot set the 'from' date to 'latest' when fetching a date range");
      }

      if (this._to && isAfter(this._from, this._to)) {
        throw new ExchangeRatesError("The 'from' date cannot be after the 'to' date");
      }
    }

    if (this._from !== 'latest' && getYear(this._from) < 1999) {
      throw new ExchangeRatesError('Cannot get historical rates before 1999');
    }
  }

  /**
   * Build and return the url to request
   *
   * @return {string}                 The url to request
   */
  _buildUrl() {
    let url = `${this._apiBaseUrl}/`;
    const qs = new QueryStringBuilder();

    if (this._isHistoryRequest()) {
      url += 'history';
      qs.addParam('start_at', this._from instanceof Date ? formatDate(this._from) : '');
      qs.addParam('end_at', this._to ? formatDate(this._to) : '');
    } else {
      url += this._from === 'latest' ? 'latest' : formatDate(this._from);
    }

    if (this._base) {
      qs.addParam('base', this._base);
    }

    if (this._symbols) {
      qs.addParam('symbols', this._symbols.join(','), false);
    }

    if (this._accessKey) {
      qs.addParam('access_key', this._accessKey);
    }

    return url + qs;
  }

  /**
   * Set the date to get historical rates for that specific day
   *
   * @param {Date} date               The date to request its historical rates
   * @return {ExchangeRatesApi}          The instance on which this method was called
   */
  at(date: Date) {
    this._from = parseDate(date);
    return this; // chainable
  }

  /**
   * Set the date to get the latest exchange rates
   *
   * @return {ExchangeRatesApi}          The instance on which this method was called
   */
  latest() {
    this._from = 'latest';
    return this; // chainable
  }

  /**
   * Set the date from which to request historical rates
   *
   * @param {Date} date               The date from which to request historical rates
   * @return {ExchangeRatesApi}          The instance on which this method was called
   */
  from(date: Date) {
    this._from = parseDate(date);
    return this; // chainable
  }

  /**
   * Set the date to which to request historical rates
   *
   * @param {Date} date               The date to which to request historical rates
   * @return {ExchangeRatesApi}          The instance on which this method was called
   */
  to(date: Date) {
    this._to = parseDate(date);
    return this; // chainable
  }

  /**
   * Set the base currency (if not explicitly set, it defaults to 'EUR')
   *
   * @param {string} currency         The base currency
   * @return {ExchangeRatesApi}          The instance on which this method was called
   */
  base(currency: string) {
    if (typeof currency !== 'string') {
      throw new TypeError('Base currency has to be a string');
    }

    const currencyUpper = currency.toUpperCase();
    this._validateCurrency(currencyUpper);

    this._base = currencyUpper;
    return this; // chainable
  }

  /**
   * Set symbols to limit results to specific exchange rate(s)
   *
   * @param {string|string[]} currencies      The currency (or an array of currencies)
   * @return {ExchangeRatesApi}                  The instance on which this method was called
   */
  symbols(currencies: string | string[]) {
    const currenciesArray = Array.isArray(currencies) ? currencies : [currencies];

    for (let i = 0; i < currenciesArray.length; i += 1) {
      let currency = currenciesArray[i];

      if (typeof currency !== 'string') {
        throw new TypeError('Symbol currencies have to be strings');
      }

      currency = currency.toUpperCase();
      this._validateCurrency(currency);

      currenciesArray[i] = currency;
    }

    this._symbols = currenciesArray;
    return this; // chainable
  }

  /**
   * The API url to request
   * @type {string}
   */
  get url() {
    this._validate();
    return this._buildUrl();
  }

  /**
   * Fetch the exchange rates from api.ratesapi.io, parse the response and return it
   *
   * @return {Promise<object|number>}     A Promise that when resolved, returns either an
   *                                      object containing the exchange rates, or a number
   *                                      if the response contains a single exchange rate
   */
  fetch<T extends Record<string, number | Record<string, number>> | number>(): Promise<T> {
    this._validate();

    const url = this._buildUrl();

    // isomorphic-fetch adds `fetch` as a global
    // eslint-disable-next-line no-undef
    return axios.get(url)
      .then((response) => {
        if (response.status !== 200) {
          throw new ExchangeRatesError(`API returned a bad response (HTTP ${response.status})`);
        }
        return response.data;
      })
      .then((data) => {
        const keys = Object.keys(data.rates);
        return keys.length === 1 ? data.rates[keys[0]] : data.rates;
      })
      .catch((err) => {
        const error = err.response?.data?.error ? JSON.stringify(err.response.data.error) : err.message;
        throw new ExchangeRatesError(`Couldn't fetch the exchange rate, ${error}`);
      });
  }

  /**
   * Return the average value of each exchange rate for the selected time period
   * To select a time period, create a chain with `.from()` and `.to()` before `.avg()`
   *
   * @param {?number} decimalPlaces       If set, it limits the number of decimal places
   * @return {Promise<object|number>}     A Promise that when resolved, returns either an
   *                                      object containing the average value of each rate
   *                                      for the selected time period, or a number if
   *                                      a single date was selected
   */
  avg(decimalPlaces = undefined) {
    if (decimalPlaces !== undefined && !Number.isInteger(decimalPlaces)) {
      throw new ExchangeRatesError('The decimal places parameter has to be an integer');
    }

    if (decimalPlaces !== undefined && decimalPlaces < 0) {
      throw new ExchangeRatesError('Decimal places cannot be negative');
    }

    return this.fetch<Record<string, number | Record<string, number>>>().then((rates) => {
      if (!this._isHistoryRequest()) return rates;

      const mergedObj: Record<string, number[]> = {};

      Object.values(rates).forEach((obj) => {
        if (typeof obj === 'object') {
          Object.keys(obj).forEach((key) => {
            mergedObj[key] = mergedObj[key] || [];
            mergedObj[key].push(obj[key]);
          });
        }
      });

      const avgRates: Record<string, number> = {};
      const keys = Object.keys(mergedObj);

      keys.forEach((key) => {
        const avgRate = mergedObj[key].reduce((p, c) => p + c, 0) / mergedObj[key].length;
        avgRates[key] = decimalPlaces === null ? avgRate : +avgRate.toFixed(decimalPlaces);
      });

      return keys.length === 1 ? avgRates[keys[0]] : avgRates;
    });
  }
}
