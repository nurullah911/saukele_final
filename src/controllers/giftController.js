'use strict';

const giftService = require('../services/giftService');

async function addGift(req, res) {
  const gift = await giftService.addGift(req.user.sub, req.body);
  res.status(201).json(gift);
}

async function reserveGift(req, res) {
  const gift = await giftService.reserveGift(req.user.sub, Number(req.params.id));
  res.status(200).json(gift);
}

async function getGift(req, res) {
  // Pass viewerUserId so private gifts can be checked against kinship tier
  const viewerUserId = req.user ? req.user.sub : null;
  const gift = await giftService.getGift(Number(req.params.id), viewerUserId);
  res.status(200).json(gift);
}

async function updateGift(req, res) {
  const gift = await giftService.updateGift(req.user.sub, Number(req.params.id), req.body);
  res.status(200).json(gift);
}

async function deleteGift(req, res) {
  await giftService.deleteGift(req.user.sub, Number(req.params.id));
  res.status(204).send();
}

module.exports = { addGift, reserveGift, getGift, updateGift, deleteGift };
