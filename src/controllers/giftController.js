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
  const gift = await giftService.getGift(Number(req.params.id));
  res.status(200).json(gift);
}

module.exports = { addGift, reserveGift, getGift };
