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

async function getFamilyTree(coupleId) {
  const couple = await prisma.user.findUnique({ where: { id: coupleId } });
  if (!couple) throw new HttpError(404, 'Couple not found');

  const relations = await prisma.$queryRaw`
    WITH RECURSIVE family_tree AS (
      SELECT 
        fr."from_user_id" as "userId",
        u.name,
        fr."kinship_type" as "kinshipType",
        fr.tier,
        1 as depth
      FROM family_relations fr
      JOIN users u ON u.id = fr."from_user_id"
      WHERE fr."to_user_id" = ${coupleId}
      
      UNION ALL
      
      SELECT
        fr2."from_user_id" as "userId",
        u2.name,
        fr2."kinship_type" as "kinshipType",
        fr2.tier,
        ft.depth + 1
      FROM family_relations fr2
      JOIN users u2 ON u2.id = fr2."from_user_id"
      JOIN family_tree ft ON ft."userId" = fr2."to_user_id"
      WHERE ft.depth < 3
    )
    SELECT DISTINCT "userId", name, "kinshipType", tier, depth
    FROM family_tree
    ORDER BY tier, depth
  `;

  return relations;
}

module.exports = { setKinship, getKinship, updateKinship, deleteKinship, getTierInfo, getFamilyTree };
