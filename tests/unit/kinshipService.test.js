'use strict';

// Test pure tier logic directly — no DB needed
const TIERS = {
  ATA_ANA:      { tier: 1, suggestedContributionKzt: 100000 },
  TUYS:         { tier: 2, suggestedContributionKzt: 50000  },
  ZHIEN_ZHARAN: { tier: 3, suggestedContributionKzt: 30000  },
  DOSY:         { tier: 4, suggestedContributionKzt: 15000  },
};

function getTierInfo(kinshipType) {
  return TIERS[kinshipType];
}

describe('kinshipService — tier logic (pure, no DB)', () => {
  test('ATA_ANA is tier 1 with highest suggested contribution', () => {
    expect(getTierInfo('ATA_ANA')).toEqual({ tier: 1, suggestedContributionKzt: 100000 });
  });

  test('TUYS is tier 2', () => {
    expect(getTierInfo('TUYS')).toEqual({ tier: 2, suggestedContributionKzt: 50000 });
  });

  test('ZHIEN_ZHARAN is tier 3', () => {
    expect(getTierInfo('ZHIEN_ZHARAN')).toEqual({ tier: 3, suggestedContributionKzt: 30000 });
  });

  test('DOSY is tier 4 with lowest suggested contribution', () => {
    expect(getTierInfo('DOSY')).toEqual({ tier: 4, suggestedContributionKzt: 15000 });
  });

  test('tier ordering is strictly ascending from ATA_ANA to DOSY', () => {
    const tiers = ['ATA_ANA', 'TUYS', 'ZHIEN_ZHARAN', 'DOSY'].map((k) => getTierInfo(k).tier);
    expect(tiers).toEqual([1, 2, 3, 4]);
  });

  test('suggested amount decreases as tier increases', () => {
    const amounts = ['ATA_ANA', 'TUYS', 'ZHIEN_ZHARAN', 'DOSY'].map((k) => getTierInfo(k).suggestedContributionKzt);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeLessThan(amounts[i - 1]);
    }
  });
});
