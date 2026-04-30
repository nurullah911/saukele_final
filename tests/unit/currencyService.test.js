'use strict';

const { getExchangeRateToKzt, toKzt } = require('../../src/services/currencyService');

describe('currencyService — snapshot rate logic', () => {
  test('KZT rate is 1 (base currency)', () => {
    expect(getExchangeRateToKzt('KZT')).toBe(1);
  });

  test('USD rate is a positive number', () => {
    const rate = getExchangeRateToKzt('USD');
    expect(rate).toBeGreaterThan(0);
  });

  test('EUR rate is a positive number', () => {
    const rate = getExchangeRateToKzt('EUR');
    expect(rate).toBeGreaterThan(0);
  });

  test('case-insensitive currency lookup', () => {
    expect(getExchangeRateToKzt('usd')).toBe(getExchangeRateToKzt('USD'));
  });

  test('toKzt converts correctly for KZT', () => {
    expect(toKzt(5000, 'KZT')).toBe(5000);
  });

  test('toKzt converts EUR to KZT using snapshot rate', () => {
    const rate = getExchangeRateToKzt('EUR');
    expect(toKzt(10, 'EUR')).toBe(10 * rate);
  });

  test('toKzt converts USD to KZT using snapshot rate', () => {
    const rate = getExchangeRateToKzt('USD');
    expect(toKzt(100, 'USD')).toBe(100 * rate);
  });

  test('unsupported currency throws an error', () => {
    expect(() => getExchangeRateToKzt('XYZ')).toThrow();
  });

  test('rate is deterministic — same call returns same value (snapshot pattern)', () => {
    const r1 = getExchangeRateToKzt('USD');
    const r2 = getExchangeRateToKzt('USD');
    expect(r1).toBe(r2);
  });
});
