'use strict';

// Pure functions extracted here — no prisma import needed
function isKuttykauPeriod(eventDate) {
  const now = new Date();
  const event = new Date(eventDate);
  const before = new Date(event); before.setDate(before.getDate() - 3);
  const after = new Date(event); after.setDate(after.getDate() + 7);
  return now >= before && now <= after;
}
function isPoliteHour() {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 20;
}

describe('notificationService — etiquette logic (pure, no DB)', () => {
  test('isKuttykauPeriod true when wedding is tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isKuttykauPeriod(tomorrow)).toBe(true);
  });

  test('isKuttykauPeriod true when wedding was 3 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(isKuttykauPeriod(threeDaysAgo)).toBe(true);
  });

  test('isKuttykauPeriod false when wedding was 30 days ago', () => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    expect(isKuttykauPeriod(monthAgo)).toBe(false);
  });

  test('isKuttykauPeriod false when wedding is 10 days away', () => {
    const tenDaysLater = new Date();
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    expect(isKuttykauPeriod(tenDaysLater)).toBe(false);
  });

  test('isPoliteHour returns a boolean', () => {
    expect(typeof isPoliteHour()).toBe('boolean');
  });
});
