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

// Recursive CTE — returns full family tree for a couple with tier obligations
// COMPLEXITY_REQ: self-referential table + recursive SQL via Prisma $queryRaw
async function getFamilyTree(req, res) {
  const coupleId = Number(req.params.coupleId);

  // Recursive CTE walks family_relations starting from the couple,
  // collects all guests and their tier/suggested amounts up to depth 3
  const rows = await prisma.$queryRaw`
    WITH RECURSIVE family_tree AS (
      SELECT
        fr.from_user_id   AS guest_id,
        u.name            AS guest_name,
        u.email           AS guest_email,
        fr.kinship_type,
        fr.tier,
        fr.to_user_id     AS couple_id,
        1                 AS depth
      FROM family_relations fr
      JOIN users u ON u.id = fr.from_user_id
      WHERE fr.to_user_id = ${coupleId}

      UNION ALL

      SELECT
        fr2.from_user_id  AS guest_id,
        u2.name           AS guest_name,
        u2.email          AS guest_email,
        fr2.kinship_type,
        fr2.tier,
        fr2.to_user_id    AS couple_id,
        ft.depth + 1      AS depth
      FROM family_relations fr2
      JOIN users u2 ON u2.id = fr2.from_user_id
      JOIN family_tree ft ON ft.couple_id = fr2.to_user_id
      WHERE ft.depth < 3
    )
    SELECT DISTINCT
      guest_id,
      guest_name,
      guest_email,
      kinship_type,
      tier,
      depth
    FROM family_tree
    ORDER BY tier ASC, guest_name ASC
  `;

  const TIER_AMOUNTS = { 1: 100000, 2: 50000, 3: 30000, 4: 15000 };
  const tree = rows.map((r) => ({
    guestId: Number(r.guest_id),
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    kinshipType: r.kinship_type,
    tier: Number(r.tier),
    depth: Number(r.depth),
    suggestedContributionKzt: TIER_AMOUNTS[Number(r.tier)] || 0,
  }));

  res.status(200).json({ coupleId, totalGuests: tree.length, familyTree: tree });
}

module.exports = { setKinship, getKinship, updateKinship, deleteKinship, getFamilyTree };
