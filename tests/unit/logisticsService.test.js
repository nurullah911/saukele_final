'use strict';

// Business rules tested in isolation — no DB needed
const PROVIDERS = {
  CHOCO:   { name: 'Choco',   supportsWhiteGlove: true,  estimateMinutes: 45 },
  INDRIVER: { name: 'inDriver', supportsWhiteGlove: false, estimateMinutes: 30 },
};
function getProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p }));
}
function validateOrder(data) {
  if (data.isFragile && !data.whiteGlove)
    throw new Error('Fragile items require white glove handling');
  if (data.whiteGlove && data.courierProvider === 'INDRIVER')
    throw new Error('inDriver does not support white glove handling');
}

describe('logisticsService — providers and business rules', () => {
  test('getProviders returns CHOCO and INDRIVER', () => {
    const ids = getProviders().map(p => p.id);
    expect(ids).toContain('CHOCO');
    expect(ids).toContain('INDRIVER');
  });

  test('CHOCO supports white glove', () => {
    expect(PROVIDERS.CHOCO.supportsWhiteGlove).toBe(true);
  });

  test('INDRIVER does not support white glove', () => {
    expect(PROVIDERS.INDRIVER.supportsWhiteGlove).toBe(false);
  });

  test('CHOCO is slower than INDRIVER', () => {
    expect(PROVIDERS.CHOCO.estimateMinutes).toBeGreaterThan(PROVIDERS.INDRIVER.estimateMinutes);
  });

  test('fragile item without white glove throws error', () => {
    expect(() => validateOrder({ isFragile: true, whiteGlove: false, courierProvider: 'CHOCO' }))
      .toThrow('Fragile items require white glove handling');
  });

  test('white glove with INDRIVER throws error', () => {
    expect(() => validateOrder({ isFragile: true, whiteGlove: true, courierProvider: 'INDRIVER' }))
      .toThrow('inDriver does not support white glove');
  });

  test('valid order — CHOCO with white glove — does not throw', () => {
    expect(() => validateOrder({ isFragile: true, whiteGlove: true, courierProvider: 'CHOCO' }))
      .not.toThrow();
  });

  test('valid order — INDRIVER no white glove — does not throw', () => {
    expect(() => validateOrder({ isFragile: false, whiteGlove: false, courierProvider: 'INDRIVER' }))
      .not.toThrow();
  });
});
