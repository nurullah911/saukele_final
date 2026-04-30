'use strict';

const { z } = require('zod');
const prisma = require('../utils/prisma');
const HttpError = require('../utils/httpError');

const TIERS = {
  ATA_ANA:      { tier: 1, suggestedContributionKzt: 100000 },
  TUYS:         { tier: 2, suggestedContributionKzt: 50000  },
  ZHIEN_ZHARAN: { tier: 3, suggestedContributionKzt: 30000  },
  DOSY:         { tier: 4, suggestedContributionKzt: 15000  },
};

const setSchema = z.object({
  coupleId:    z.number().int().positive(),
  kinshipType: z.enum(['ATA_ANA', 'TUYS', 'ZHIEN_ZHARAN', 'DOSY']),
});

const updateSchema = z.object({
  kinshipType: z.enum(['ATA_ANA', 'TUYS', 'ZHIEN_ZHARAN', 'DOSY']),
});

function getTierInfo(kinshipType) {
  return TIERS[kinshipType];
}

async function setKinship(userId, input) {
  const data = setSchema.parse(input);
  if (data.coupleId === userId) throw new HttpError(400, 'Cannot create relation to yourself');

  const couple = await prisma.user.findUnique({ where: { id: data.coupleId } });
  if (!couple) throw new HttpError(404, 'Couple user not found');

  const info = getTierInfo(data.kinshipType);
  const relation = await prisma.familyRelation.create({
    data: {
      fromUserId:  userId,
      toUserId:    data.coupleId,
      kinshipType: data.kinshipType,
      tier:        info.tier,
    },
  }).catch(() => { throw new HttpError(409, 'Relation already exists'); });

  return { ...relation, suggestedContributionKzt: info.suggestedContributionKzt };
}

async function getKinship(userId, coupleId) {
  const relation = await prisma.familyRelation.findUnique({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: coupleId } },
  });
  if (!relation) throw new HttpError(404, 'Kinship relation not found');
  const info = getTierInfo(relation.kinshipType);
  return { ...relation, suggestedContributionKzt: info.suggestedContributionKzt };
}

async function updateKinship(userId, coupleId, input) {
  const data = updateSchema.parse(input);
  const existing = await prisma.familyRelation.findUnique({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: coupleId } },
  });
  if (!existing) throw new HttpError(404, 'Kinship relation not found');

  const info = getTierInfo(data.kinshipType);
  const updated = await prisma.familyRelation.update({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: coupleId } },
    data: { kinshipType: data.kinshipType, tier: info.tier },
  });
  return { ...updated, suggestedContributionKzt: info.suggestedContributionKzt };
}

async function deleteKinship(userId, coupleId) {
  const existing = await prisma.familyRelation.findUnique({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: coupleId } },
  });
  if (!existing) throw new HttpError(404, 'Kinship relation not found');
  await prisma.familyRelation.delete({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: coupleId } },
  });
}

module.exports = { setKinship, getKinship, updateKinship, deleteKinship, getTierInfo };
