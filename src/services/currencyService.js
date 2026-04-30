const RATES_TO_KZT = {
  KZT: 1,
  USD: 470,
  EUR: 510
};

function getExchangeRateToKzt(currency = 'KZT') {
  const normalized = currency.toUpperCase();
  const rate = RATES_TO_KZT[normalized];
  if (!rate) throw new Error('Unsupported currency');
  return rate;
}

function toKzt(amountOriginal, currency = 'KZT') {
  return Number(amountOriginal) * getExchangeRateToKzt(currency);
}

module.exports = { getExchangeRateToKzt, toKzt };
