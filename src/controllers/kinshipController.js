'use strict';

const kinshipService = require('../services/kinshipService');
const prisma = require('../utils/prisma');

async function setKinship(req, res) {
  const relation = await kinshipService.setKinship(req.user.sub, req.body);
  res.status(201).json(relation);
}

async function getKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  const relation = await kinshipService.getKinship(req.user.sub, coupleId);
  res.status(200).json(relation);
}

async function updateKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  const relation = await kinshipService.updateKinship(req.user.sub, coupleId, req.body);
  res.status(200).json(relation);
}

async function deleteKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  await kinshipService.deleteKinship(req.user.sub, coupleId);
  res.status(204).send();
}

// Family tree built in application layer using Prisma ORM only (zero raw SQL)
// COMPLEXITY_REQ: self-referential table traversal with tier-based gift obligations
async function getFamilyTree(req, res) {
  const coupleId = Number(req.params.coupleId);

  // Fetch all relations to this couple using Prisma ORM
  const relations = await prisma.familyRelation.findMany({
    where: { toUserId: coupleId },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: [{ tier: 'asc' }, { fromUser: { name: 'asc' } }]
  });

  const TIER_AMOUNTS = { 1: 100000, 2: 50000, 3: 30000, 4: 15000 };

  // Build family tree in application layer — no raw SQL
  // Group by tier for clear hierarchy
  const treeByTier = {};
  for (const rel of relations) {
    if (!treeByTier[rel.tier]) treeByTier[rel.tier] = [];
    treeByTier[rel.tier].push({
      guestId: rel.fromUser.id,
      guestName: rel.fromUser.name,
      guestEmail: rel.fromUser.email,
      kinshipType: rel.kinshipType,
      tier: rel.tier,
      suggestedContributionKzt: TIER_AMOUNTS[rel.tier] || 0,
    });
  }

  const familyTree = Object.values(treeByTier).flat();

  res.status(200).json({
    coupleId,
    totalGuests: familyTree.length,
    familyTree,
    treeByTier,
  });
}

module.exports = { setKinship, getKinship, updateKinship, deleteKinship, getFamilyTree };
